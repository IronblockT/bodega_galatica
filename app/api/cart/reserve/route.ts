import { NextResponse } from "next/server";

type RawCartItem = {
  item_type?: "card" | "product";
  item_key?: string;
  sku_key?: string;
  product_id?: string;
  qty: number;
};

type Body = {
  order_id?: string | null;
  items: RawCartItem[];
  ttl_minutes?: number;
};

type NormalizedCartItem =
  | {
      item_type: "card";
      sku_key: string;
      item_key: string;
      qty: number;
    }
  | {
      item_type: "product";
      product_id: string;
      item_key: string;
      sku_key: string;
      qty: number;
    };

function buildInFilter(values: string[]) {
  const quoted = values.map((v) => `"${v.replaceAll('"', '\\"')}"`).join(",");
  return encodeURIComponent(`(${quoted})`);
}

function asNumber(v: any) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Number(n) : NaN;
}

function normalizeItems(items: RawCartItem[]): NormalizedCartItem[] {
  const clean: NormalizedCartItem[] = [];

  for (const raw of items ?? []) {
    const qty = Math.floor(Number(raw?.qty ?? 0));
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const rawType = String(raw?.item_type ?? "").trim();

    if (rawType === "product") {
      const productId = String(
        raw?.product_id ??
          raw?.item_key ??
          String(raw?.sku_key ?? "").replace(/^product:/, "")
      ).trim();

      if (!productId) continue;

      clean.push({
        item_type: "product",
        product_id: productId,
        item_key: productId,
        sku_key: `product:${productId}`,
        qty,
      });

      continue;
    }

    const skuKey = String(raw?.sku_key ?? raw?.item_key ?? "").trim();

    if (!skuKey || skuKey.startsWith("product:")) continue;

    clean.push({
      item_type: "card",
      sku_key: skuKey,
      item_key: skuKey,
      qty,
    });
  }

  const map = new Map<string, NormalizedCartItem>();

  for (const item of clean) {
    const key =
      item.item_type === "product"
        ? `product:${item.product_id}`
        : `card:${item.sku_key}`;

    const existing = map.get(key);

    if (existing) {
      map.set(key, {
        ...existing,
        qty: existing.qty + item.qty,
      } as NormalizedCartItem);
    } else {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

function isStockLikeError(msg: string) {
  const m = msg.toLowerCase();

  return (
    m.includes("insufficient_stock_for_sku") ||
    m.includes("inventory_not_found_for_sku") ||
    m.includes("insufficient_stock_for_product") ||
    m.includes("product_inventory_not_found") ||
    m.includes("product_not_found_or_inactive") ||
    m.includes("order_not_found_or_not_editable")
  );
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing auth token" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Body;

    const items = normalizeItems(body?.items ?? []);

    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "Carrinho vazio" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anonKey =
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_URL/SERVICE_ROLE" },
        { status: 500 }
      );
    }

    const goTrueApiKey = anonKey || serviceRole;

    const meRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: goTrueApiKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!meRes.ok) {
      const t = await meRes.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Auth failed: ${t}` },
        { status: 401 }
      );
    }

    const me = await meRes.json();
    const userId = me?.id as string | undefined;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Invalid user" },
        { status: 401 }
      );
    }

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

      if (!r.ok) {
        throw new Error(`RPC ${fn} failed: ${txt}`);
      }

      return txt ? JSON.parse(txt) : null;
    };

    const ttl = Math.max(5, Math.min(Number(body.ttl_minutes ?? 30), 120));

    let orderId = body.order_id ?? null;

    if (orderId) {
      const existingRes = await sb(
        `orders?select=id,status&user_id=eq.${encodeURIComponent(
          userId
        )}&id=eq.${encodeURIComponent(orderId)}&limit=1`,
        { method: "GET" }
      );

      const existing = (await existingRes.json()) as any[];
      const row = existing?.[0];

      const okStatus = ["draft", "reserved", "awaiting_payment"].includes(
        String(row?.status ?? "")
      );

      if (!row?.id || !okStatus) {
        orderId = null;
      }
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

      if (!orderId) {
        throw new Error("orders insert: não retornou id");
      }
    }

    const cardItems = items.filter(
      (item): item is Extract<NormalizedCartItem, { item_type: "card" }> =>
        item.item_type === "card"
    );

    const productItems = items.filter(
      (item): item is Extract<NormalizedCartItem, { item_type: "product" }> =>
        item.item_type === "product"
    );

    const enriched: any[] = [];

    // =====================================================
    // 1) Enriquecer cards/singles
    // =====================================================
    if (cardItems.length) {
      const skuKeys = cardItems.map((i) => i.sku_key);
      const skuIn = buildInFilter(skuKeys);

      const priceRes = await sb(
        `swu_price_current?select=sku_key,card_uid,finish,promo_type,condition,price_brl&sku_key=in.${skuIn}`,
        { method: "GET" }
      );

      const priceRows = (await priceRes.json()) as any[];
      const priceBySku = new Map(priceRows.map((r) => [r.sku_key, r]));

      const missing = skuKeys.filter((s) => !priceBySku.has(s));

      if (missing.length) {
        return NextResponse.json(
          {
            ok: false,
            error: "SKU inválido ou sem preço no carrinho",
            detail: { missing },
          },
          { status: 400 }
        );
      }

      const cardUidSet = new Set<string>();

      for (const row of priceRows) {
        if (typeof row?.card_uid === "string" && row.card_uid.trim()) {
          cardUidSet.add(row.card_uid.trim());
        }
      }

      const cardUids = Array.from(cardUidSet);

      let cards: any[] = [];

      if (cardUids.length) {
        const cardUidIn = buildInFilter(cardUids);

        try {
          const cardsRes = await sb(
            `swu_cards_market_ui?select=card_uid,title&card_uid=in.${cardUidIn}`,
            { method: "GET" }
          );
          cards = (await cardsRes.json()) as any[];
        } catch {
          const cardsRes = await sb(
            `swu_cards?select=card_uid,title&card_uid=in.${cardUidIn}`,
            { method: "GET" }
          );
          cards = (await cardsRes.json()) as any[];
        }
      }

      const cardMap = new Map(cards.map((c) => [c.card_uid, c]));

      for (const it of cardItems) {
        const priceRow = priceBySku.get(it.sku_key)!;
        const card = priceRow.card_uid ? cardMap.get(priceRow.card_uid) : null;

        const title = (card?.title ?? it.sku_key) as string;
        const unitPrice = asNumber(priceRow?.price_brl ?? 0);

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new Error(`PRICE_INVALID sku_key=${it.sku_key}`);
        }

        enriched.push({
          item_type: "card",
          sku_key: it.sku_key,
          item_key: it.sku_key,
          qty: it.qty,
          unit_price_brl: unitPrice,
          snapshot: {
            item_type: "card",
            title,
            card_uid: priceRow.card_uid ?? null,
            finish: priceRow.finish ?? null,
            condition: priceRow.condition ?? null,
            promo_type: priceRow.promo_type ?? null,
            unit_price_brl: unitPrice,
          },
        });
      }
    }

    // =====================================================
    // 2) Enriquecer produtos gerais
    // =====================================================
    if (productItems.length) {
      const productIds = productItems.map((i) => i.product_id);
      const productIn = buildInFilter(productIds);

      const productRes = await sb(
        `products_ui?select=id,slug,name,category,expansion_code,description,image_url,price_brl,qty_available&id=in.${productIn}`,
        { method: "GET" }
      );

      const productRows = (await productRes.json()) as any[];
      const productById = new Map(productRows.map((p) => [p.id, p]));

      const missing = productIds.filter((id) => !productById.has(id));

      if (missing.length) {
        return NextResponse.json(
          {
            ok: false,
            error: "Produto inválido ou indisponível",
            detail: { missing },
          },
          { status: 400 }
        );
      }

      for (const it of productItems) {
        const product = productById.get(it.product_id)!;
        const unitPrice = asNumber(product?.price_brl ?? 0);

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new Error(`PRICE_INVALID product_id=${it.product_id}`);
        }

        enriched.push({
          item_type: "product",
          product_id: it.product_id,
          item_key: it.product_id,
          sku_key: `product:${it.product_id}`,
          qty: it.qty,
          unit_price_brl: unitPrice,
          snapshot: {
            item_type: "product",
            title: product.name ?? product.slug ?? it.product_id,
            product_id: it.product_id,
            slug: product.slug ?? null,
            category: product.category ?? null,
            expansion_code: product.expansion_code ?? null,
            image_url: product.image_url ?? null,
            unit_price_brl: unitPrice,
          },
        });
      }
    }

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

      if (isStockLikeError(msg)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Sem estoque para um ou mais itens",
            detail: msg,
          },
          { status: 409 }
        );
      }

      if (msg.includes("PRICE_INVALID")) {
        return NextResponse.json(
          {
            ok: false,
            error: "Preço inválido para um ou mais itens do carrinho",
            detail: msg,
          },
          { status: 400 }
        );
      }

      throw err;
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}