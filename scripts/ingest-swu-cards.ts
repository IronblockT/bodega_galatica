require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase env vars');
}

const API_BASE = 'https://admin.starwarsunlimited.com/api/cards';
const PAGE_SIZE = 100;

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

    // O source pode vir como array de strings ou array de objetos
    const arr = Array.isArray(v)
        ? v.map((x) => {
            const s = typeof x === 'string' ? x : (x?.name ?? x?.title ?? x?.code ?? x?.value ?? '');
            return String(s).trim();
        }).filter(Boolean)
        : [];

    // Escapa aspas e barra invertida (padrão Postgres array)
    const escaped = arr.map((s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'));

    // {"A","B"}
    return `{${escaped.map((s) => `"${s}"`).join(',')}}`;
}

async function supabaseUpsert(
    table: string,
    payload: JsonObject,
    onConflict: string
): Promise<void> {
    const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;

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


async function run() {
    console.log('🔄 Fetching SWU cards (paginated)...');

    let page = 1;
    let pageCount = 1;
    let totalUpserts = 0;

    while (page <= pageCount) {
        const url =
            `${API_BASE}?pagination[page]=${page}` +
            `&pagination[pageSize]=${PAGE_SIZE}` +
            `&populate=deep`;

        const res = await fetch(url);
        const json = await res.json();

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
                console.warn(`⚠️ Sem expansion_code para: ${attr.title} (${attr.cardUid}) — pulando`);
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
                source_url: url, // agora salva o URL da página onde veio
                source_payload: attr as unknown as JsonValue,
            };

            await supabaseUpsert('swu_cards', payload, 'card_uid');

            totalUpserts += 1;

            // log mais leve (senão fica gigante)
            // console.log(`✅ ${attr.title}`);
        }

        page += 1;
    }

    console.log(`🎉 Ingest completed successfully — total upserts: ${totalUpserts}`);
}

run().catch((err) => {
    console.error('❌ Ingest failed:', err);
    process.exit(1);
});
