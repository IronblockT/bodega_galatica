import { NextResponse } from "next/server";

type Body = {
  order_id?: string | null;
  items: Array<{ sku_key: string; qty: number }>;
  ttl_minutes?: number;
};

function normalizeItems(items: Array<{ sku_key: string; qty: number }>) {
  // 1) remove inválidos + normaliza qty int >= 1
  const clean = items
    .map((x) => ({
      sku_key: String(x.sku_key ?? "").trim(),
      qty: Math.floor(Number(x.qty ?? 0)),
    }))
    .filter((x) => x.sku_key && Number.isFinite(x.qty) && x.qty > 0);

  // 2) agrupa sku repetido (idempotência do carrinho)
  const map = new Map<string, number>();
  for (const it of clean) {
    map.set(it.sku_key, (map.get(it.sku_key) ?? 0) + it.qty);
  }

  return Array.from(map.entries()).map(([sku_key, qty]) => ({ sku_key, qty }));
}

function isStockLikeError(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("insufficient_stock_for_sku") ||
    m.includes("inventory_not_found_for_sku") ||
    m.includes("order_not_found_or_not_editable")
  );
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing auth token" }, { status: 401 });
    }

    const body = (await req.json()) as Body;

    const items = normalizeItems(body?.items ?? []);
    if (!items.length) {
      return NextResponse.json({ ok: false, error: "Carrinho vazio" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_URL/SERVICE_ROLE" },
        { status: 500 }
      );
    }

    // ✅ Use anon key (ou fallback) como apikey pro GoTrue; não precisa usar service role aqui
    const goTrueApiKey = anonKey || serviceRole;

    // 1) Descobre user_id via JWT do supabase
    const meRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: goTrueApiKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!meRes.ok) {
      const t = await meRes.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Auth failed: ${t}` }, { status: 401 });
    }

    const me = await meRes.json();
    const userId = me?.id as string | undefined;
    if (!userId) return NextResponse.json({ ok: false, error: "Invalid user" }, { status: 401 });

    const sb = async (path: string, init: RequestInit) => {
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(init.headers || {}),
        },
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Supabase error ${res.status}: ${t}`);
      }
      return res;
    };

    const rpcJson = async (fn: string, payload: any) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const txt = await r.text().catch(() => "");
      if (!r.ok) throw new Error(`RPC ${fn} failed: ${txt}`);
      return txt ? JSON.parse(txt) : null;
    };

    const ttl = Math.max(5, Math.min(Number(body.ttl_minutes ?? 30), 120));

    // 2) Garante order_id: reutiliza se ainda for editável, senão cria outra
    let orderId = body.order_id ?? null;

    if (orderId) {
      const existingRes = await sb(
        `orders?select=id,status&user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(orderId)}&limit=1`,
        { method: "GET" }
      );
      const existing = (await existingRes.json()) as any[];
      const row = existing?.[0];

      const okStatus = ["draft", "reserved", "awaiting_payment"].includes(String(row?.status ?? ""));
      if (!row?.id || !okStatus) orderId = null;
    }

    if (!orderId) {
      const created = await sb("orders?select=id", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          status: "draft",
          subtotal_brl: 0,
          shipping_brl: 0,
          discount_brl: 0,
          total_brl: 0,
          currency: "BRL",
        }),
      });

      const data = (await created.json()) as any[];
      orderId = data?.[0]?.id ?? null;
      if (!orderId) throw new Error("orders insert: não retornou id");
    }

    // 3) Enriquecer: unit_price_brl + snapshot por sku_key
    const skuKeys = items.map((i) => i.sku_key);

    const buildInFilter = (values: string[]) => {
      const quoted = values.map((v) => `"${v.replaceAll('"', '\\"')}"`).join(",");
      return encodeURIComponent(`(${quoted})`);
    };
    const skuIn = buildInFilter(skuKeys);

    // inventário por sku
    let invRows: any[] = [];
    try {
      const invRes = await sb(
        `swu_inventory_ui?select=sku_key,card_uid,finish,condition,promo_type&sku_key=in.${skuIn}`,
        { method: "GET" }
      );
      invRows = (await invRes.json()) as any[];
    } catch {
      const invRes = await sb(
        `swu_inventory?select=sku_key,card_uid,finish,condition,promo_type&sku_key=in.${skuIn}`,
        { method: "GET" }
      );
      invRows = (await invRes.json()) as any[];
    }

    const invBySku = new Map(invRows.map((r) => [r.sku_key, r]));
    const missing = skuKeys.filter((s) => !invBySku.has(s));
    if (missing.length) {
      return NextResponse.json(
        { ok: false, error: "SKU inválido no carrinho", detail: { missing } },
        { status: 400 }
      );
    }

    const cardUids = Array.from(new Set(invRows.map((r) => r.card_uid).filter(Boolean)));

    let cards: any[] = [];
    if (cardUids.length) {
      const cardUidIn = buildInFilter(cardUids);
      try {
        const cardsRes = await sb(
          `swu_cards_market_ui?select=card_uid,title,min_price_brl_nm&card_uid=in.${cardUidIn}`,
          { method: "GET" }
        );
        cards = (await cardsRes.json()) as any[];
      } catch {
        const cardsRes = await sb(
          `swu_cards?select=card_uid,card_name&card_uid=in.${cardUidIn}`,
          { method: "GET" }
        );
        const raw = (await cardsRes.json()) as any[];
        cards = raw.map((c) => ({
          card_uid: c.card_uid,
          title: c.card_name ?? null,
          min_price_brl_nm: null,
        }));
      }
    }

    const cardMap = new Map(cards.map((c) => [c.card_uid, c]));

    const asNumber = (v: any) => {
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? Number(n) : NaN;
    };

    const enriched = items.map((it) => {
      const inv = invBySku.get(it.sku_key)!;
      const card = inv.card_uid ? cardMap.get(inv.card_uid) : undefined;

      const title = (card?.title ?? it.sku_key) as string;

      const unitPrice = asNumber(card?.min_price_brl_nm ?? 0);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        // ✅ erro “negócio”, não “crash”
        throw new Error(`PRICE_INVALID sku_key=${it.sku_key}`);
      }

      return {
        sku_key: it.sku_key,
        qty: it.qty,
        unit_price_brl: unitPrice,
        snapshot: {
          title,
          card_uid: inv.card_uid ?? null,
          finish: inv.finish ?? null,
          condition: inv.condition ?? null,
          promo_type: inv.promo_type ?? null,
          unit_price_brl: unitPrice,
        },
      };
    });

    // 4) Reserva/renova
    try {
      const reserve = await rpcJson("rpc_checkout_reserve", {
        p_order_id: orderId,
        p_items: enriched,
        p_ttl_minutes: ttl,
      });

      return NextResponse.json({
        ok: true,
        order_id: orderId,
        expires_at: reserve?.expires_at ?? null,
        status: reserve?.status ?? "reserved",
      });
    } catch (err: any) {
      const msg = err?.message ?? String(err);

      // ✅ 409 para problemas de estoque / reserva
      if (isStockLikeError(msg)) {
        return NextResponse.json(
          { ok: false, error: "Sem estoque para um ou mais itens", detail: msg },
          { status: 409 }
        );
      }

      // ✅ 400 para preço inválido (seu mercado ainda pode estar vazio)
      if (msg.includes("PRICE_INVALID")) {
        return NextResponse.json(
          { ok: false, error: "Preço inválido para um ou mais itens do carrinho", detail: msg },
          { status: 400 }
        );
      }

      throw err;
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Erro interno" }, { status: 500 });
  }
}