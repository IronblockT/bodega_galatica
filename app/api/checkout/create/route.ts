import { NextResponse } from "next/server";

type CreateCheckoutBody = {
  user_id: string;
  order_id?: string | null;
  items?: Array<{ sku_key: string; qty: number }>;
  payer?: { email?: string; name?: string };
  idempotency_key?: string;
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

type EnrichedItem = {
  sku_key: string;
  qty: number;
  unit_price_brl: number;
  line_total_brl: number;
  snapshot: {
    title: string;
    card_uid: string | null;
    finish: string | null;
    condition: string | null;
    promo_type: string | null;
    unit_price_brl: number;
  };
  mp_item: {
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: "BRL";
  };
};

const asNumber = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Number(n) : NaN;
};

const buildInFilter = (values: string[]) => {
  const quoted = values.map((v) => `"${v.replaceAll('"', '\\"')}"`).join(",");
  return encodeURIComponent(`(${quoted})`);
};

const safeJson = async <T = unknown>(res: Response) => {
  const txt = await res.text().catch(() => "");
  if (!txt || !txt.trim()) return { ok: true, data: null as T | null, raw: txt };
  try {
    return { ok: true, data: JSON.parse(txt) as T, raw: txt };
  } catch {
    return { ok: false, data: null as T | null, raw: txt };
  }
};

const mustJson = async <T = unknown>(res: Response, label: string) => {
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

    const hasOrderId = !!String(body?.order_id ?? "").trim();
    const hasItems = Array.isArray(body?.items) && body.items.length > 0;

    if (!hasOrderId && !hasItems) {
      return NextResponse.json(
        { error: "Envie order_id ou items para criar o checkout" },
        { status: 400 }
      );
    }

    if (hasItems && body.items!.some((i) => !i.sku_key || !i.qty || i.qty <= 0)) {
      return NextResponse.json({ error: "Itens inválidos (sku_key/qty)" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const appUrl = process.env.APP_URL!;
    const mpAccessToken = process.env.MP_ACCESS_TOKEN!;

    if (!supabaseUrl || !supabaseKey || !appUrl || !mpAccessToken) {
      return NextResponse.json(
        {
          error:
            "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/APP_URL/MP_ACCESS_TOKEN)",
        },
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
        const t = await res.text().catch(() => "");
        throw new Error(`Supabase error ${res.status}: ${t}`);
      }

      return res;
    };

    const callRpc = async (name: string, payload: unknown) => {
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

    const idem = body.idempotency_key?.trim();

    if (idem) {
      const existingOrderRes = await sb(
        `orders?select=id,status&user_id=eq.${encodeURIComponent(
          body.user_id
        )}&idempotency_key=eq.${encodeURIComponent(idem)}&limit=1`,
        { method: "GET" }
      );
      const existingOrders = (await existingOrderRes.json()) as Array<{ id?: string; status?: string }>;
      const existingOrder = existingOrders?.[0];

      if (existingOrder?.id) {
        const existingPayRes = await sb(
          `payments?select=provider_preference_id,provider_payload&order_id=eq.${existingOrder.id}&provider=eq.mercadopago&limit=1`,
          { method: "GET" }
        );
        const payRows = (await existingPayRes.json()) as Array<{
          provider_preference_id?: string | null;
          provider_payload?: { init_point?: string | null } | null;
        }>;
        const pay = payRows?.[0];

        return NextResponse.json({
          order_id: existingOrder.id,
          preference_id: pay?.provider_preference_id ?? null,
          init_point: pay?.provider_payload?.init_point ?? null,
          idempotent: true,
          status: existingOrder.status ?? null,
        });
      }
    }

    let orderId: string | null = String(body.order_id ?? "").trim() || null;
    let enriched: EnrichedItem[] = [];
    let subtotal = 0;
    let shipping = 0;
    let discount = 0;
    let total = 0;
    let reservePayload: unknown = null;

    if (orderId) {
      const orderRes = await sb(
        `orders?select=id,status,subtotal_brl,shipping_brl,discount_brl,total_brl&user_id=eq.${encodeURIComponent(
          body.user_id
        )}&id=eq.${encodeURIComponent(orderId)}&limit=1`,
        { method: "GET" }
      );

      const orderRows = (await orderRes.json()) as Array<{
        id?: string;
        status?: string;
        subtotal_brl?: number | string | null;
        shipping_brl?: number | string | null;
        discount_brl?: number | string | null;
        total_brl?: number | string | null;
      }>;
      const existingOrder = orderRows?.[0];

      if (!existingOrder?.id) {
        return NextResponse.json({ error: "order_id inválido" }, { status: 404 });
      }

      const okStatus = ["reserved", "awaiting_payment", "draft"].includes(
        String(existingOrder.status ?? "")
      );
      if (!okStatus) {
        return NextResponse.json(
          { error: `Order não está apta para checkout (status=${existingOrder.status})` },
          { status: 409 }
        );
      }

      const existingPayRes = await sb(
        `payments?select=provider_preference_id,provider_payload&order_id=eq.${encodeURIComponent(
          orderId
        )}&provider=eq.mercadopago&limit=1`,
        { method: "GET" }
      );
      const existingPayRows = (await existingPayRes.json()) as Array<{
        provider_preference_id?: string | null;
        provider_payload?: { init_point?: string | null } | null;
      }>;
      const existingPay = existingPayRows?.[0];

      if (existingPay?.provider_preference_id && existingPay?.provider_payload?.init_point) {
        return NextResponse.json({
          order_id: orderId,
          preference_id: existingPay.provider_preference_id,
          init_point: existingPay.provider_payload.init_point,
          reused: true,
        });
      }

      const itemRes = await sb(
        `order_items?select=sku_key,qty,unit_price_brl,line_total_brl,item_snapshot&order_id=eq.${encodeURIComponent(
          orderId
        )}`,
        { method: "GET" }
      );

      const orderItems = (await itemRes.json()) as Array<{
        sku_key: string;
        qty: number;
        unit_price_brl?: number | string | null;
        line_total_brl?: number | string | null;
        item_snapshot?: {
          title?: string;
          card_uid?: string | null;
          finish?: string | null;
          condition?: string | null;
          promo_type?: string | null;
          unit_price_brl?: number | string | null;
        } | null;
      }>;

      if (!orderItems.length) {
        return NextResponse.json(
          { error: "Essa order não possui itens para checkout" },
          { status: 400 }
        );
      }

      enriched = orderItems.map((x) => {
        const snapshot = x.item_snapshot ?? {};
        const title = snapshot.title ?? x.sku_key;
        const unitPrice = asNumber(x.unit_price_brl ?? snapshot.unit_price_brl ?? 0);
        const qty = Number(x.qty ?? 0);
        const lineTotal = asNumber(x.line_total_brl ?? unitPrice * qty);

        return {
          sku_key: x.sku_key,
          qty,
          unit_price_brl: unitPrice,
          line_total_brl: Number.isFinite(lineTotal) ? lineTotal : unitPrice * qty,
          snapshot: {
            title,
            card_uid: snapshot.card_uid ?? null,
            finish: snapshot.finish ?? null,
            condition: snapshot.condition ?? null,
            promo_type: snapshot.promo_type ?? null,
            unit_price_brl: unitPrice,
          },
          mp_item: {
            title,
            quantity: qty,
            unit_price: unitPrice,
            currency_id: "BRL",
          },
        };
      });

      subtotal = asNumber(existingOrder.subtotal_brl ?? 0);
      shipping = asNumber(existingOrder.shipping_brl ?? 0);
      discount = asNumber(existingOrder.discount_brl ?? 0);
      total = asNumber(existingOrder.total_brl ?? 0);

      if (!Number.isFinite(subtotal)) {
        subtotal = enriched.reduce((acc, x) => acc + x.line_total_brl, 0);
      }
      if (!Number.isFinite(shipping)) shipping = 0;
      if (!Number.isFinite(discount)) discount = 0;
      if (!Number.isFinite(total) || total <= 0) {
        total = subtotal + shipping - discount;
      }
    } else {
      const inputItems = body.items ?? [];
      const skus = inputItems.map((i) => i.sku_key);
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

      if (!invRows.length) {
        return NextResponse.json(
          { error: "Nenhum SKU encontrado no inventário" },
          { status: 404 }
        );
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
        new Set(
          invRows
            .map((r) => (typeof r.card_uid === "string" ? r.card_uid : ""))
            .filter((v) => v.length > 0)
        )
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
            `swu_cards?select=card_uid,title&card_uid=in.${cardUidIn}`,
            { method: "GET" }
          );
          const raw = (await cardsRes.json()) as Array<{ card_uid: string; title?: string | null }>;
          cards = raw.map((c) => ({
            card_uid: c.card_uid,
            title: c.title ?? null,
            min_price_brl_nm: null,
          }));
        }
      }

      const cardMap = new Map(cards.map((c) => [c.card_uid, c]));

      enriched = inputItems.map((it) => {
        const inv = invBySku.get(it.sku_key)!;
        const card = inv.card_uid ? cardMap.get(inv.card_uid) : undefined;
        const title = card?.title ?? it.sku_key;

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

      subtotal = enriched.reduce((acc, x) => acc + x.line_total_brl, 0);
      shipping = 0;
      discount = 0;
      total = subtotal + shipping - discount;

      const orderRes = await sb("orders?select=id", {
        method: "POST",
        body: JSON.stringify({
          user_id: body.user_id,
          idempotency_key: idem ?? null,
          status: "draft",
          subtotal_brl: subtotal,
          shipping_brl: shipping,
          discount_brl: discount,
          total_brl: total,
          currency: "BRL",
        }),
      });

      const orderData = await mustJson<Array<{ id?: string }>>(orderRes, "orders insert");
      const order = orderData?.[0];
      if (!order?.id) throw new Error("orders insert: não retornou id");
      orderId = order.id;

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

      const reserveParsed = await safeJson<unknown>(reserveRes);
      reservePayload = reserveParsed.data ?? reserveParsed.raw ?? null;

      if (!reserveRes.ok) {
        await sb(`orders?id=eq.${orderId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        });
        return NextResponse.json(
          { error: "Falha ao reservar estoque", detail: reservePayload },
          { status: 409 }
        );
      }

      if (
        reserveParsed.data &&
        typeof reserveParsed.data === "object" &&
        "ok" in reserveParsed.data &&
        (reserveParsed.data as { ok?: boolean }).ok === false
      ) {
        await sb(`orders?id=eq.${orderId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        });
        return NextResponse.json(
          { error: "Sem estoque para um ou mais itens", detail: reserveParsed.data },
          { status: 409 }
        );
      }

      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "reserved" }),
      });
    }

    if (!orderId) {
      throw new Error("Não foi possível determinar o order_id");
    }

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

      if (reservePayload) {
        await callRpc("rpc_checkout_release", { p_order_id: orderId }).catch(() => null);
      }

      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });

      return NextResponse.json({ error: "Falha ao criar checkout", detail: t }, { status: 502 });
    }

    const mpPref = await mustJson<{ id?: string; init_point?: string }>(
      mpRes,
      "mercadopago preferences"
    );

    if (!mpPref?.id || !mpPref?.init_point) {
      throw new Error(
        `mercadopago preferences: JSON sem id/init_point. Body: ${JSON.stringify(mpPref).slice(
          0,
          500
        )}`
      );
    }

    await sb(`orders?id=eq.${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "awaiting_payment" }),
    });

    try {
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
    } catch (err: unknown) {
      console.log("[checkout/create] payments insert failed (non-fatal)", {
        orderId,
        prefId: mpPref.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({
      order_id: orderId,
      preference_id: mpPref.id,
      init_point: mpPref.init_point,
      reserve: reservePayload,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro interno" },
      { status: 500 }
    );
  }
}