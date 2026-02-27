require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase env vars');
}

const API_BASE = 'https://admin.starwarsunlimited.com/api/cards';
const PAGE_SIZE = 100;

// ✅ Rodar uma coleção por vez (iniciando com SOR)
// Depois é só trocar aqui para SHD, TWI, etc.
const TARGET_EXPANSION = 'LAW';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type JsonObject = { [key: string]: JsonValue };

function toPgTextArray(v: any): string {
  if (!v) return '{}';

  const arr = Array.isArray(v)
    ? v
        .map((x) => {
          const s =
            typeof x === 'string'
              ? x
              : x?.name ?? x?.title ?? x?.code ?? x?.value ?? '';
          return String(s).trim();
        })
        .filter(Boolean)
    : [];

  const escaped = arr.map((s) =>
    s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  );

  return `{${escaped.map((s) => `"${s}"`).join(',')}}`;
}

async function supabaseUpsert(
  table: string,
  payload: JsonObject,
  onConflict: string
): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(
    onConflict
  )}`;

  const headers: HeadersInit = {
    apikey: SUPABASE_KEY as string,
    Authorization: `Bearer ${SUPABASE_KEY as string}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error (${table}): ${text}`);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ Fetch robusto: evita crash quando API retorna HTML (rate limit / WAF / 5xx)
async function fetchJsonWithRetry(url: string, tries = 6) {
  let lastErr: any = null;

  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'bgexchange-ingest/1.0',
        },
      });

      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      if (!res.ok) {
        const preview = text.slice(0, 200).replace(/\s+/g, ' ');
        console.error(
          `❌ HTTP ${res.status} on attempt ${attempt}/${tries} for ${url}\nPreview: ${preview}`
        );

        // 429/5xx: retry com backoff
        if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
          const wait = Math.min(30_000, 1000 * Math.pow(2, attempt - 1));
          await sleep(wait);
          continue;
        }

        throw new Error(`HTTP ${res.status} (non-retryable) for ${url}`);
      }

      // Se veio HTML ou qualquer coisa não-JSON, tenta novamente
      if (!contentType.includes('application/json')) {
        const preview = text.slice(0, 200).replace(/\s+/g, ' ');
        console.error(
          `❌ Non-JSON content-type "${contentType}" attempt ${attempt}/${tries} for ${url}\nPreview: ${preview}`
        );
        const wait = Math.min(30_000, 1000 * Math.pow(2, attempt - 1));
        await sleep(wait);
        continue;
      }

      return JSON.parse(text);
    } catch (err: any) {
      lastErr = err;
      console.error(
        `❌ fetchJson attempt ${attempt}/${tries} failed: ${err?.message ?? err}`
      );
      const wait = Math.min(30_000, 1000 * Math.pow(2, attempt - 1));
      await sleep(wait);
    }
  }

  throw lastErr ?? new Error('fetchJsonWithRetry failed');
}

async function run() {
  console.log(`🔄 Fetching SWU cards (paginated) — target: ${TARGET_EXPANSION}`);

  let page = 1;
  let pageCount = 1;
  let totalUpserts = 0;

  while (page <= pageCount) {
    const url =
      `${API_BASE}?pagination[page]=${page}` +
      `&pagination[pageSize]=${PAGE_SIZE}` +
      `&populate=deep`;

    const json = await fetchJsonWithRetry(url);

    const cards = json.data ?? [];
    const meta = json.meta?.pagination;

    pageCount = meta?.pageCount ?? 1;

    console.log(`📄 Page ${page}/${pageCount} — ${cards.length} cards`);

    for (const card of cards) {
      const attr = card.attributes;

      // ========================
      // Expansion
      // ========================
      const expAttr = attr.expansion?.data?.attributes ?? null;

      const expansionCode =
        expAttr?.code ??
        expAttr?.abbreviation ??
        expAttr?.shortCode ??
        expAttr?.slug ??
        expAttr?.name ??
        null;

      if (!expansionCode) {
        console.warn(
          `⚠️ Sem expansion_code para: ${attr.title} (${attr.cardUid}) — pulando`
        );
        continue;
      }

      // ✅ filtro: apenas a coleção alvo (ex: SOR)
      if (String(expansionCode) !== TARGET_EXPANSION) {
        continue;
      }

      // garante que o set exista
      await supabaseUpsert(
        'swu_expansions',
        {
          code: String(expansionCode),
          name: expAttr?.name ? String(expAttr.name) : String(expansionCode),
        },
        'code'
      );

      // ========================
      // Images
      // ========================
      const frontUrl = attr.artFront?.data?.attributes?.url ?? null;
      const backUrl = attr.artBack?.data?.attributes?.url ?? null;

      // ========================
      // Card payload
      // ========================
      const payload = {
        card_uid: attr.cardUid,
        expansion_code: String(expansionCode),

        title: attr.title,
        subtitle: attr.subtitle ?? null,
        card_number: attr.cardNumber ?? null,
        card_count: attr.cardCount ?? null,
        artist: attr.artist ?? null,

        rarity: attr.rarity ?? null,
        card_type: attr.type ?? null,
        aspects: toPgTextArray(attr.aspects),
        traits: toPgTextArray(attr.traits),
        keywords: toPgTextArray(attr.keywords),

        cost: attr.cost ?? null,
        power: attr.power ?? null,
        hp: attr.hp ?? null,

        rules_text: attr.text ?? null,
        deploy_box: attr.deployBox ?? null,
        epic_action: attr.epicAction ?? null,
        reminder_text: attr.reminderText ?? null,

        is_unique: attr.unique ?? false,
        has_foil: attr.hasFoil ?? false,
        hyperspace: attr.hyperspace ?? false,
        showcase: attr.showcase ?? false,

        image_front_url: frontUrl,
        image_back_url: backUrl,
        image_thumb_url: frontUrl,

        source: 'official_admin',
        source_url: url,
        source_payload: attr as unknown as JsonValue,
      };

      await supabaseUpsert('swu_cards', payload, 'card_uid');

      totalUpserts += 1;
    }

    // ✅ Pequena pausa por página para evitar rate limit
    await sleep(200);

    page += 1;
  }

  console.log(
    `🎉 Ingest completed successfully — target=${TARGET_EXPANSION} — total upserts: ${totalUpserts}`
  );
}

run().catch((err) => {
  console.error('❌ Ingest failed:', err);
  process.exit(1);
});