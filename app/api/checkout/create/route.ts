import { NextResponse } from "next/server";

type CreateCheckoutBody = {
  user_id: string; // obrigatório
  items: Array<{ sku_key: string; qty: number }>;
  payer?: { email?: string; name?: string };
};

type InvRow = {
  sku_key: string;
  card_uid?: string | null;
  finish?: string | null;
  condition?: string | null;
  promo_type?: string | null;
};

type CardRow = {
  card_uid: string;
  title?: string | null;
  min_price_brl_nm?: number | string | null;
};

const asNumber = (v: any) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Number(n) : NaN;
};

// PostgREST "in.(...)" precisa de valores com aspas e URL-encoded
// Ex: sku_key=in.("6053::standard::regular::NM","...") com encodeURIComponent
const buildInFilter = (values: string[]) => {
  const quoted = values.map((v) => `"${v.replaceAll('"', '\\"')}"`).join(",");
  return encodeURIComponent(`(${quoted})`);
};

const safeJson = async <T = any>(res: Response) => {
  const txt = await res.text();
  if (!txt || !txt.trim()) return { ok: true, data: null as T | null, raw: txt };
  try {
    return { ok: true, data: JSON.parse(txt) as T, raw: txt };
  } catch {
    return { ok: false, data: null as T | null, raw: txt };
  }
};

const mustJson = async <T = any>(res: Response, label: string) => {
  const parsed = await safeJson<T>(res);
  if (!parsed.ok) {
    throw new Error(
      `${label}: resposta não é JSON. HTTP ${res.status}. Body: ${parsed.raw.slice(0, 500)}`
    );
  }
  return parsed.data;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateCheckoutBody;

    if (!body?.user_id) {
      return NextResponse.json({ error: "user_id é obrigatório" }, { status: 400 });
    }
    if (!body?.items?.length) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }
    if (body.items.some((i) => !i.sku_key || !i.qty || i.qty <= 0)) {
      return NextResponse.json({ error: "Itens inválidos (sku_key/qty)" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const appUrl = process.env.APP_URL!;
    const mpAccessToken = process.env.MP_ACCESS_TOKEN!;

    console.log("[checkout/create] env flags", {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAppUrl: !!process.env.APP_URL,
      hasMpToken: !!process.env.MP_ACCESS_TOKEN,
    });

    if (!supabaseUrl || !supabaseKey || !appUrl || !mpAccessToken) {
      return NextResponse.json(
        { error: "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/APP_URL/MP_ACCESS_TOKEN)" },
        { status: 500 }
      );
    }

    const sb = async (path: string, init: RequestInit) => {
      const method = (init.method ?? "GET").toUpperCase();

      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          ...(method !== "GET" ? { Prefer: "return=representation" } : {}),
          ...(init.headers || {}),
        },
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Supabase error ${res.status}: ${t}`);
      }
      return res;
    };

    const callRpc = async (name: string, payload: any) => {
      return fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    };

    // 1) Buscar detalhes para calcular preço/total
    const skus = body.items.map((i) => i.sku_key);
    const skuIn = buildInFilter(skus);

    let invRows: InvRow[] = [];
    try {
      const invRes = await sb(
        `swu_inventory_ui?select=sku_key,card_uid,finish,condition,promo_type&sku_key=in.${skuIn}`,
        { method: "GET" }
      );
      invRows = (await invRes.json()) as InvRow[];
    } catch {
      const invRes = await sb(
        `swu_inventory?select=sku_key,card_uid,finish,condition,promo_type&sku_key=in.${skuIn}`,
        { method: "GET" }
      );
      invRows = (await invRes.json()) as InvRow[];
    }

    if (!invRows?.length) {
      return NextResponse.json({ error: "Nenhum SKU encontrado no inventário" }, { status: 404 });
    }

    const invBySku = new Map(invRows.map((r) => [r.sku_key, r]));
    const missing = skus.filter((s) => !invBySku.has(s));
    if (missing.length) {
      return NextResponse.json(
        { error: "SKU(s) inválido(s)", detail: { missing } },
        { status: 400 }
      );
    }

    const cardUids = Array.from(
      new Set(invRows.map((r) => r.card_uid).filter(Boolean) as string[])
    );

    let cards: CardRow[] = [];
    if (cardUids.length) {
      const cardUidIn = buildInFilter(cardUids);
      try {
        const cardsRes = await sb(
          `swu_cards_market_ui?select=card_uid,title,min_price_brl_nm&card_uid=in.${cardUidIn}`,
          { method: "GET" }
        );
        cards = (await cardsRes.json()) as CardRow[];
      } catch {
        const cardsRes = await sb(
          `swu_cards?select=card_uid,card_name&card_uid=in.${cardUidIn}`,
          { method: "GET" }
        );
        const raw = (await cardsRes.json()) as any[];
        cards = raw.map((c) => ({
          card_uid: c.card_uid,
          title: c.card_name ?? c.title ?? null,
          min_price_brl_nm: null,
        }));
      }
    }

    const cardMap = new Map(cards.map((c) => [c.card_uid, c]));

    const enriched = body.items.map((it) => {
      const inv = invBySku.get(it.sku_key)!;
      const card = inv.card_uid ? cardMap.get(inv.card_uid) : undefined;

      const title = (card?.title ?? it.sku_key) as string;

      const unitPrice = asNumber(card?.min_price_brl_nm ?? 0);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new Error(
          `Preço inválido para sku_key=${it.sku_key} (unitPrice=${String(unitPrice)})`
        );
      }

      const lineTotal = unitPrice * it.qty;

      return {
        sku_key: it.sku_key,
        qty: it.qty,
        unit_price_brl: unitPrice,
        line_total_brl: lineTotal,
        snapshot: {
          title,
          card_uid: inv.card_uid ?? null,
          finish: inv.finish ?? null,
          condition: inv.condition ?? null,
          promo_type: inv.promo_type ?? null,
          unit_price_brl: unitPrice,
        },
        mp_item: {
          title,
          quantity: it.qty,
          unit_price: unitPrice,
          currency_id: "BRL",
        },
      };
    });

    const subtotal = enriched.reduce((acc, x) => acc + x.line_total_brl, 0);
    const shipping = 0;
    const discount = 0;
    const total = subtotal + shipping - discount;

    // 2) Criar ORDER (status válido)
    const orderRes = await sb("orders?select=id", {
      method: "POST",
      body: JSON.stringify({
        user_id: body.user_id,
        status: "draft",
        subtotal_brl: subtotal,
        shipping_brl: shipping,
        discount_brl: discount,
        total_brl: total,
        currency: "BRL",
      }),
    });

    const orderData = await mustJson<any[]>(orderRes, "orders insert");
    const order = orderData?.[0];
    if (!order?.id) throw new Error("orders insert: não retornou id");
    const orderId = order.id as string;

    // 3) Inserir ORDER ITEMS
    await sb("order_items", {
      method: "POST",
      body: JSON.stringify(
        enriched.map((x) => ({
          order_id: orderId,
          sku_key: x.sku_key,
          qty: x.qty,
          unit_price_brl: x.unit_price_brl,
          line_total_brl: x.line_total_brl,
          item_snapshot: x.snapshot,
        }))
      ),
    });

    // 4) Reservar estoque via RPC correto do seu banco
    const reserveRes = await callRpc("rpc_checkout_reserve", {
      p_order_id: orderId,
      p_items: enriched.map((x) => ({
        sku_key: x.sku_key,
        qty: x.qty,
        unit_price_brl: x.unit_price_brl,
        snapshot: x.snapshot,
      })),
      p_ttl_minutes: 30,
    });

    const reserveParsed = await safeJson<any>(reserveRes);
    const reserveDetail = reserveParsed.data ?? reserveParsed.raw ?? null;

    if (!reserveRes.ok) {
      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      return NextResponse.json(
        { error: "Falha ao reservar estoque", detail: reserveDetail },
        { status: 409 }
      );
    }

    // se seu RPC retornar { ok: false, ... } a gente trata também
    if (reserveParsed.data && reserveParsed.data.ok === false) {
      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      return NextResponse.json(
        { error: "Sem estoque para um ou mais itens", detail: reserveParsed.data },
        { status: 409 }
      );
    }

    // ✅ marca como reservado
    await sb(`orders?id=eq.${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "reserved" }),
    });

    // 5) Criar preferência Mercado Pago
    const prefBody = {
      items: enriched.map((x) => x.mp_item),
      external_reference: orderId,
      notification_url: `${appUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${appUrl}/checkout/success?order=${orderId}`,
        failure: `${appUrl}/checkout/failure?order=${orderId}`,
        pending: `${appUrl}/checkout/pending?order=${orderId}`,
      },
      auto_return: "approved",
      payer: body.payer?.email ? { email: body.payer.email } : undefined,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prefBody),
    });

    if (!mpRes.ok) {
      const t = await mpRes.text().catch(() => "");

      // libera reserva via RPC existente
      await callRpc("rpc_checkout_release", { p_order_id: orderId }).catch(() => null);

      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });

      return NextResponse.json({ error: "Falha ao criar checkout", detail: t }, { status: 502 });
    }

    const mpPref = await mustJson<any>(mpRes, "mercadopago preferences");
    if (!mpPref?.id || !mpPref?.init_point) {
      throw new Error(
        `mercadopago preferences: JSON sem id/init_point. Body: ${JSON.stringify(mpPref).slice(0, 500)}`
      );
    }

    // ✅ aguardando pagamento
    await sb(`orders?id=eq.${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "awaiting_payment" }),
    });

    // 6) Registrar payment (se houver CHECK em payments.status e "pending" não valer, troque depois)
    await sb("payments", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        provider: "mercadopago",
        status: "pending",
        provider_preference_id: mpPref.id,
        amount_brl: total,
        currency: "BRL",
        provider_payload: mpPref,
      }),
    });

    return NextResponse.json({
      order_id: orderId,
      preference_id: mpPref.id,
      init_point: mpPref.init_point,
      reserve: reserveParsed.data ?? reserveParsed.raw ?? null, // ajuda debug
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro interno" }, { status: 500 });
  }
}
