import { NextResponse } from "next/server";

type CreateCheckoutBody = {
  user_id?: string;
  order_id?: string | null;
  items?: Array<{ sku_key: string; qty: number }>;
  payer?: { email?: string; name?: string };
  idempotency_key?: string;

  coupon_code?: string | null;
  store_credit_applied_brl?: number | string | null;
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
  item_type?: "card" | "product";
  sku_key: string | null;
  product_id?: string | null;
  qty: number;
  unit_price_brl: number;
  line_total_brl: number;
  snapshot: {
    item_type?: "card" | "product";
    title: string;
    card_uid?: string | null;
    product_id?: string | null;
    slug?: string | null;
    category?: string | null;
    expansion_code?: string | null;
    image_url?: string | null;
    finish?: string | null;
    condition?: string | null;
    promo_type?: string | null;
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
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "Sessão não autenticada" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreateCheckoutBody;

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
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const appUrl = process.env.APP_URL!;
    const mpAccessToken = process.env.MP_ACCESS_TOKEN!;

    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey || !appUrl || !mpAccessToken) {
      return NextResponse.json(
        {
          error:
            "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY/APP_URL/MP_ACCESS_TOKEN)",
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

    const meRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!meRes.ok) {
      return NextResponse.json(
        { error: "Sessão inválida ou expirada" },
        { status: 401 }
      );
    }

    const me = (await meRes.json()) as {
      id?: string | null;
      email?: string | null;
    };

    const userId = String(me?.id ?? "").trim();

    if (!userId) {
      return NextResponse.json(
        { error: "Usuário inválido" },
        { status: 401 }
      );
    }

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

    const callRpcJson = async (name: string, payload: unknown) => {
      const res = await callRpc(name, payload);
      const parsed = await safeJson<unknown>(res);
      const detail = parsed.data ?? parsed.raw ?? null;

      if (!res.ok) {
        throw new Error(`RPC ${name} failed: ${JSON.stringify(detail).slice(0, 500)}`);
      }

      if (
        detail &&
        typeof detail === "object" &&
        "ok" in detail &&
        (detail as { ok?: boolean }).ok === false
      ) {
        throw new Error(`RPC ${name} returned ok=false: ${JSON.stringify(detail).slice(0, 500)}`);
      }

      return detail;
    };

    // =====================================================
    // Regras oficiais do checkout
    // =====================================================
    const settingsRes = await sb(
      "checkout_settings?select=shipping_flat_brl,coupon_discount_percent,free_shipping_min_brl&limit=1",
      { method: "GET" }
    );

    const settingsRows = (await settingsRes.json()) as Array<{
      shipping_flat_brl?: number | string | null;
      coupon_discount_percent?: number | string | null;
      free_shipping_min_brl?: number | string | null;
    }>;

    const checkoutSettings = settingsRows?.[0];

    if (!checkoutSettings) {
      return NextResponse.json(
        { error: "Configurações do checkout não encontradas" },
        { status: 500 }
      );
    }

    const shippingFlatBrl = asNumber(
      checkoutSettings.shipping_flat_brl ?? 0
    );

    const couponDiscountPercent = asNumber(
      checkoutSettings.coupon_discount_percent ?? 0
    );

    const freeShippingMinBrl = asNumber(
      checkoutSettings.free_shipping_min_brl ?? 0
    );

    if (
      !Number.isFinite(shippingFlatBrl) ||
      shippingFlatBrl < 0 ||
      !Number.isFinite(couponDiscountPercent) ||
      couponDiscountPercent < 0 ||
      couponDiscountPercent > 100 ||
      !Number.isFinite(freeShippingMinBrl) ||
      freeShippingMinBrl < 0
    ) {
      return NextResponse.json(
        { error: "Configurações do checkout inválidas" },
        { status: 500 }
      );
    }

    const profileRes = await sb(
      `profiles?select=id,email,full_name,phone,cpf,pix_key&id=eq.${encodeURIComponent(
        userId
      )}&limit=1`,
      { method: "GET" }
    );

    const profileRows = (await profileRes.json()) as Array<{
      id?: string | null;
      email?: string | null;
      full_name?: string | null;
      phone?: string | null;
      cpf?: string | null;
      pix_key?: string | null;
    }>;

    const profile = profileRows?.[0] ?? null;

    const hasText = (value: unknown) => {
      return typeof value === "string" && value.trim().length > 0;
    };

    const onlyDigits = (value: unknown) => {
      return typeof value === "string" ? value.replace(/\D/g, "") : "";
    };

    const missingProfileFields: string[] = [];

    const cpfDigits = onlyDigits(profile?.cpf);
    const pixKey = String(profile?.pix_key ?? "").trim();

    if (!profile?.id) {
      missingProfileFields.push("profile");
    }

    if (!cpfDigits) {
      missingProfileFields.push("cpf");
    } else if (cpfDigits.length !== 11) {
      missingProfileFields.push("cpf_invalid");
    }

    if (!pixKey) {
      missingProfileFields.push("pix_key");
    }

    if (missingProfileFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_REQUIRED_PROFILE",
          error: "Complete seus dados pessoais antes de finalizar a compra.",
          missing_fields: missingProfileFields,
          redirect_to: "/minha-conta?next=/checkout&missingProfile=1",
        },
        { status: 409 }
      );
    }

    const addressRes = await sb(
      `addresses?select=id,user_id,label,is_default,cep,street,number,complement,district,city,state,created_at&user_id=eq.${encodeURIComponent(
        userId
      )}&order=is_default.desc,created_at.desc&limit=10`,
      { method: "GET" }
    );

    const addressRows = (await addressRes.json()) as Array<{
      id?: string | null;
      user_id?: string | null;
      label?: string | null;
      is_default?: boolean | null;
      cep?: string | null;
      street?: string | null;
      number?: string | null;
      complement?: string | null;
      district?: string | null;
      city?: string | null;
      state?: string | null;
      created_at?: string | null;
    }>;

    const isValidShippingAddress = (addr: (typeof addressRows)[number] | null | undefined) => {
      return !!addr?.id && hasText(addr.cep) && hasText(addr.street) && hasText(addr.number);
    };

    const shippingAddress =
      addressRows.find((addr) => addr.is_default && isValidShippingAddress(addr)) ??
      addressRows.find((addr) => isValidShippingAddress(addr)) ??
      null;

    const missingAddressFields: string[] = [];

    if (!shippingAddress?.id) {
      missingAddressFields.push("address");
    } else {
      if (!hasText(shippingAddress.cep)) missingAddressFields.push("cep");
      if (!hasText(shippingAddress.street)) missingAddressFields.push("street");
      if (!hasText(shippingAddress.number)) missingAddressFields.push("number");
    }

    console.log("[checkout/address-validation]", {
      user_id: userId,
      found_addresses: addressRows.length,
      selected_address_id: shippingAddress?.id ?? null,
      selected_is_default: shippingAddress?.is_default ?? null,
      missing_fields: missingAddressFields,
      addresses_debug: addressRows.map((addr) => ({
        id: addr.id,
        is_default: addr.is_default,
        cep: addr.cep,
        street: addr.street,
        number: addr.number,
        city: addr.city,
        state: addr.state,
        created_at: addr.created_at,
      })),
    });

    if (missingAddressFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_SHIPPING_ADDRESS",
          error: "Cadastre seu endereço de entrega antes de finalizar a compra.",
          missing_fields: missingAddressFields,
          address_debug: {
            found_addresses: addressRows.length,
            selected_address: shippingAddress,
            addresses: addressRows.map((addr) => ({
              id: addr.id,
              is_default: addr.is_default,
              cep: addr.cep,
              street: addr.street,
              number: addr.number,
              city: addr.city,
              state: addr.state,
              created_at: addr.created_at,
            })),
          },
          redirect_to: "/minha-conta?next=/checkout&missingAddress=1",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // Saldo oficial de crédito da loja
    // =====================================================
    const storeCreditRes = await sb(
      `user_store_credit?select=user_id,balance_brl&user_id=eq.${encodeURIComponent(
        userId
      )}&limit=1`,
      { method: "GET" }
    );

    const storeCreditRows = (await storeCreditRes.json()) as Array<{
      user_id?: string;
      balance_brl?: number | string | null;
    }>;

    const storeCreditBalance = asNumber(
      storeCreditRows?.[0]?.balance_brl ?? 0
    );

    if (!Number.isFinite(storeCreditBalance) || storeCreditBalance < 0) {
      return NextResponse.json(
        { error: "Saldo de crédito da loja inválido" },
        { status: 500 }
      );
    }

    const idem = body.idempotency_key?.trim();

    if (idem) {
      const existingOrderRes = await sb(
        `orders?select=id,status&user_id=eq.${encodeURIComponent(
          userId
        )}&idempotency_key=eq.${encodeURIComponent(idem)}&limit=1`,
        { method: "GET" }
      );

      const existingOrders = (await existingOrderRes.json()) as Array<{
        id?: string;
        status?: string;
      }>;

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
    let couponDiscount = 0;
    let storeCreditApplied = 0;
    let discount = 0;
    let total = 0;
    let reservePayload: unknown = null;

    const requestedStoreCredit = asNumber(
      body.store_credit_applied_brl ?? 0
    );

    const requestedCouponCode =
      String(body.coupon_code ?? "").trim().toUpperCase() || null;

    let hasValidCoupon = false;

    if (requestedCouponCode) {
      const couponRes = await sb(
        `checkout_coupons?select=id,code,active&code=eq.${encodeURIComponent(
          requestedCouponCode
        )}&active=eq.true&limit=1`,
        { method: "GET" }
      );

      const couponRows = (await couponRes.json()) as Array<{
        id?: string;
        code?: string;
        active?: boolean;
      }>;

      const coupon = couponRows?.[0];

      if (!coupon?.id) {
        return NextResponse.json(
          { error: "Cupom inválido ou inativo" },
          { status: 400 }
        );
      }

      hasValidCoupon = true;
    }

    if (Number.isFinite(requestedStoreCredit) && requestedStoreCredit < 0) {
      return NextResponse.json({ error: "store_credit_applied_brl inválido" }, { status: 400 });
    }

    if (orderId) {
      const orderRes = await sb(
        `orders?select=id,status,subtotal_brl,shipping_brl,discount_brl,total_brl&user_id=eq.${encodeURIComponent(
          userId
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
        `order_items?select=item_type,sku_key,product_id,product_slug,product_category,product_image_url,qty,unit_price_brl,line_total_brl,item_snapshot&order_id=eq.${encodeURIComponent(
          orderId
        )}`,
        { method: "GET" }
      );

      const orderItems = (await itemRes.json()) as Array<{
        item_type?: "card" | "product" | null;
        sku_key?: string | null;
        product_id?: string | null;
        product_slug?: string | null;
        product_category?: string | null;
        product_image_url?: string | null;
        qty: number;
        unit_price_brl?: number | string | null;
        line_total_brl?: number | string | null;
        item_snapshot?: {
          item_type?: "card" | "product" | null;
          title?: string;
          card_uid?: string | null;
          product_id?: string | null;
          slug?: string | null;
          category?: string | null;
          expansion_code?: string | null;
          image_url?: string | null;
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
        const itemType =
          x.item_type === "product" || snapshot.item_type === "product" ? "product" : "card";

        const fallbackTitle =
          itemType === "product" ? x.product_slug ?? x.product_id ?? "Produto" : x.sku_key ?? "Carta";

        const title = snapshot.title ?? fallbackTitle;
        const unitPrice = asNumber(x.unit_price_brl ?? snapshot.unit_price_brl ?? 0);
        const qty = Number(x.qty ?? 0);
        const lineTotal = asNumber(x.line_total_brl ?? unitPrice * qty);

        return {
          item_type: itemType,
          sku_key: x.sku_key ?? null,
          product_id: x.product_id ?? snapshot.product_id ?? null,
          qty,
          unit_price_brl: unitPrice,
          line_total_brl: Number.isFinite(lineTotal) ? lineTotal : unitPrice * qty,
          snapshot: {
            item_type: itemType,
            title,
            card_uid: snapshot.card_uid ?? null,
            product_id: x.product_id ?? snapshot.product_id ?? null,
            slug: x.product_slug ?? snapshot.slug ?? null,
            category: x.product_category ?? snapshot.category ?? null,
            expansion_code: snapshot.expansion_code ?? null,
            image_url: x.product_image_url ?? snapshot.image_url ?? null,
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

      subtotal = enriched.reduce((acc, x) => acc + x.line_total_brl, 0);

      couponDiscount = hasValidCoupon
        ? Number((subtotal * (couponDiscountPercent / 100)).toFixed(2))
        : 0;

      shipping =
        freeShippingMinBrl > 0 && subtotal >= freeShippingMinBrl
          ? 0
          : shippingFlatBrl;


      const requestedStoreCreditSafe = Number.isFinite(requestedStoreCredit)
        ? Math.max(requestedStoreCredit, 0)
        : 0;

      const maxStoreCreditForOrder = Math.max(
        subtotal - couponDiscount,
        0
      );

      storeCreditApplied = Number(
        Math.min(
          requestedStoreCreditSafe,
          storeCreditBalance,
          maxStoreCreditForOrder
        ).toFixed(2)
      );

      discount = Number(
        (couponDiscount + storeCreditApplied).toFixed(2)
      );

      total = Number(
        Math.max(
          subtotal + shipping - discount,
          0
        ).toFixed(2)
      );

      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          subtotal_brl: subtotal,
          shipping_brl: shipping,
          coupon_discount_brl: couponDiscount,
          store_credit_applied_brl: storeCreditApplied,
          discount_brl: discount,
          total_brl: total,
          notes: requestedCouponCode ? `Cupom aplicado: ${requestedCouponCode}` : null,
        }),
      });
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

          const raw = (await cardsRes.json()) as Array<{
            card_uid: string;
            title?: string | null;
          }>;

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

      couponDiscount = hasValidCoupon
        ? Number((subtotal * (couponDiscountPercent / 100)).toFixed(2))
        : 0;

      shipping =
        freeShippingMinBrl > 0 && subtotal >= freeShippingMinBrl
          ? 0
          : shippingFlatBrl;


      const requestedStoreCreditSafe = Number.isFinite(requestedStoreCredit)
        ? Math.max(requestedStoreCredit, 0)
        : 0;

      const maxStoreCreditForOrder = Math.max(
        subtotal - couponDiscount,
        0
      );

      storeCreditApplied = Number(
        Math.min(
          requestedStoreCreditSafe,
          storeCreditBalance,
          maxStoreCreditForOrder
        ).toFixed(2)
      );

      discount = Number(
        (couponDiscount + storeCreditApplied).toFixed(2)
      );

      total = Number(
        Math.max(
          subtotal + shipping - discount,
          0
        ).toFixed(2)
      );

      const orderRes = await sb("orders?select=id", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          idempotency_key: idem ?? null,
          status: "draft",
          subtotal_brl: subtotal,
          shipping_brl: shipping,
          coupon_discount_brl: couponDiscount,
          store_credit_applied_brl: storeCreditApplied,
          discount_brl: discount,
          total_brl: total,
          currency: "BRL",
          notes: requestedCouponCode ? `Cupom aplicado: ${requestedCouponCode}` : null,
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

    if (total <= 0) {
      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "reserved",
          total_brl: 0,
          coupon_discount_brl: couponDiscount,
          store_credit_applied_brl: storeCreditApplied,
          discount_brl: discount,
          shipping_brl: shipping,
          subtotal_brl: subtotal,
          notes: requestedCouponCode
            ? `Cupom aplicado: ${requestedCouponCode}`
            : null,
        }),
      });

      await callRpcJson("rpc_checkout_commit", {
        p_order_id: orderId,
        p_provider: "store_credit",
        p_provider_payment_id: `store_credit:${orderId}`,
        p_amount_brl: 0,
        p_provider_payload: {
          method: "store_credit",
          coupon_code: requestedCouponCode,
          coupon_discount_brl: couponDiscount,
          store_credit_applied_brl: storeCreditApplied,
          subtotal_brl: subtotal,
          shipping_brl: shipping,
          total_brl: 0,
        },
      });

      return NextResponse.json({
        order_id: orderId,
        paid_with_store_credit: true,
        init_point: null,
        preference_id: null,
        total_brl: 0,
      });
    }

    const refreshResult = (await callRpcJson("rpc_checkout_refresh", {
      p_order_id: orderId,
      p_ttl_minutes: 30,
    })) as {
      ok?: boolean;
      order_id?: string;
      expires_at?: string | null;
    } | null;

    const checkoutExpiresAt = refreshResult?.expires_at ?? null;

    if (!checkoutExpiresAt) {
      throw new Error(
        "Não foi possível determinar a expiração da reserva do checkout"
      );
    }

    const prefBody = {
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: checkoutExpiresAt,
      items: [
        {
          title: `Pedido Bodega Galática #${orderId.slice(0, 8)}`,
          quantity: 1,
          unit_price: Number(total.toFixed(2)),
          currency_id: "BRL" as const,
        },
      ],
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

      await callRpc("rpc_checkout_release", {
        p_order_id: orderId,
      });

      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });

      return NextResponse.json({ error: "Falha ao criar checkout", detail: t }, { status: 502 });
    }

    let mpPref: { id?: string; init_point?: string } | null = null;

    try {
      mpPref = await mustJson<{ id?: string; init_point?: string }>(
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
    } catch (err: unknown) {
      await callRpc("rpc_checkout_release", {
        p_order_id: orderId,
      });

      await sb(`orders?id=eq.${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });

      return NextResponse.json(
        {
          error: "Resposta inválida do Mercado Pago",
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 502 }
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