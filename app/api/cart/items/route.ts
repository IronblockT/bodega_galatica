// app/api/cart/items/route.ts
import { NextResponse } from "next/server";

type Body = {
  sku_keys: string[];
};

function buildInFilter(values: string[]) {
  const quoted = values
    .map((v) => `"${String(v).replaceAll('"', '\\"')}"`)
    .join(",");

  return encodeURIComponent(`(${quoted})`);
}

function isProductCartKey(value: string) {
  return value.startsWith("product:");
}

function extractProductId(value: string) {
  return value.replace(/^product:/, "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const rawKeys = Array.from(
      new Set(
        (body?.sku_keys ?? [])
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
      )
    );

    if (!rawKeys.length) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const cardSkuKeys = rawKeys.filter((key) => !isProductCartKey(key));

    const productCartKeys = rawKeys.filter(isProductCartKey);

    const productIds = Array.from(
      new Set(
        productCartKeys
          .map(extractProductId)
          .filter(Boolean)
      )
    );

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const sb = async (path: string) => {
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method: "GET",
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Supabase error ${res.status}: ${txt}`);
      }

      return res.json();
    };

    const resultItems: any[] = [];

    // =====================================================
    // 1) Itens do tipo card/single
    // =====================================================
    if (cardSkuKeys.length) {
      const skuIn = buildInFilter(cardSkuKeys);

      const priceRows = await sb(
        `swu_price_current?select=sku_key,card_uid,finish,promo_type,condition,price_brl&sku_key=in.${skuIn}`
      );

      const cardUidSet = new Set<string>();

      for (const row of priceRows as any[]) {
        if (typeof row?.card_uid === "string" && row.card_uid.trim()) {
          cardUidSet.add(row.card_uid.trim());
        }
      }

      const cardUids: string[] = Array.from(cardUidSet);

      let cardRows: any[] = [];

      if (cardUids.length) {
        const cardUidIn = buildInFilter(cardUids);

        try {
          cardRows = await sb(
            `swu_cards_market_ui?select=card_uid,title,subtitle,image_front_url,image_thumb_url,min_price_brl_nm&card_uid=in.${cardUidIn}`
          );
        } catch {
          try {
            cardRows = await sb(
              `swu_cards_finish_ui?select=card_uid,title,subtitle,image_front_url,image_thumb_url&card_uid=in.${cardUidIn}`
            );
          } catch {
            cardRows = await sb(
              `swu_cards?select=card_uid,title,subtitle,image_front_url,image_thumb_url&card_uid=in.${cardUidIn}`
            );
          }
        }
      }

      const cardMap = new Map((cardRows ?? []).map((r: any) => [r.card_uid, r]));

      const cardItems = (priceRows ?? []).map((row: any) => {
        const card = cardMap.get(row.card_uid);

        return {
          item_type: "card",
          sku_key: row.sku_key,
          item_key: row.sku_key,
          card_uid: row.card_uid ?? null,
          product_id: null,
          name: card?.title ?? row.card_uid ?? row.sku_key,
          subtitle: card?.subtitle ?? null,
          image_url: card?.image_thumb_url ?? card?.image_front_url ?? null,
          finish: row.finish ?? null,
          condition: row.condition ?? null,
          promo_type: row.promo_type ?? null,
          price_brl: row.price_brl ?? card?.min_price_brl_nm ?? null,
          qty_available: null,
        };
      });

      resultItems.push(...cardItems);
    }

    // =====================================================
    // 2) Itens do tipo product
    // =====================================================
    if (productIds.length) {
      const productIn = buildInFilter(productIds);

      const productRows = await sb(
        `products_ui?select=id,slug,name,category,expansion_code,description,image_url,price_brl,qty_available&id=in.${productIn}`
      );

      const productItems = (productRows ?? []).map((row: any) => {
        return {
          item_type: "product",
          sku_key: `product:${row.id}`,
          item_key: row.id,
          card_uid: null,
          product_id: row.id,
          name: row.name ?? row.slug ?? row.id,
          subtitle: row.expansion_code
            ? `${row.category ?? "Produto"} • ${row.expansion_code}`
            : row.category ?? "Produto",
          image_url: row.image_url ?? null,
          finish: null,
          condition: null,
          promo_type: row.category ?? null,
          price_brl: row.price_brl ?? null,
          qty_available: row.qty_available ?? null,
        };
      });

      resultItems.push(...productItems);
    }

    // Mantém a ordem original do carrinho
    const resultBySku = new Map(resultItems.map((item) => [item.sku_key, item]));

    const orderedItems = rawKeys
      .map((key) => resultBySku.get(key))
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      items: orderedItems,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}