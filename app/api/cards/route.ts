import { NextResponse } from "next/server";

function toArrayParam(v: string | null) {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toPgArrayLiteral(arr: string[]) {
  const escaped = arr.map((s) =>
    `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );
  return `{${escaped.join(",")}}`;
}

const CONDITION_ORDER = ["NM", "EX", "VG", "G", "LP", "MP", "HP", "DMG"] as const;
const BATCH_SIZE = 200;
const SUPABASE_PAGE_SIZE = 1000;

function pickRecommendedCondition(
  variants: Record<string, { stock?: number; price?: number }>,
  onlyInStock: boolean
) {
  if (onlyInStock) {
    for (const c of CONDITION_ORDER) {
      const s = Number(variants?.[c]?.stock ?? 0);
      const p = Number(variants?.[c]?.price ?? 0);

      if (s > 0 && p > 0) return c;
    }

    for (const c of CONDITION_ORDER) {
      const s = Number(variants?.[c]?.stock ?? 0);

      if (s > 0) return c;
    }
  }

  for (const c of CONDITION_ORDER) {
    const p = Number(variants?.[c]?.price ?? 0);

    if (p > 0) return c;
  }

  for (const c of CONDITION_ORDER) {
    if (variants?.[c]) return c;
  }

  return "NM";
}

function chunkArray<T>(arr: T[], size: number): T[][];
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function fetchAllRows(queryBuilder: any) {
  const all: any[] = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;

    const { data, error } = await queryBuilder.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      break;
    }

    all.push(...data);

    if (data.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}

async function batchedInQuery(
  supabase: any,
  table: string,
  selectClause: string,
  column: string,
  values: string[],
  extra?: (query: any) => any
) {
  const chunks = chunkArray(values, BATCH_SIZE);
  const all: any[] = [];

  for (const chunk of chunks) {
    let query = supabase.from(table).select(selectClause).in(column, chunk);
    if (extra) query = extra(query);

    const rows = await fetchAllRows(query);
    all.push(...rows);
  }

  return all;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon =
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" },
        { status: 500 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseAnon);

    const q = (searchParams.get("q") ?? "").trim();
    const set = searchParams.get("set");
    const rarity = searchParams.get("rarity");
    const type = searchParams.get("type");

    const aspects = toArrayParam(searchParams.get("aspects"));
    const traits = toArrayParam(searchParams.get("traits"));
    const keywords = toArrayParam(searchParams.get("keywords"));

    const stock = searchParams.get("stock") ?? "";
    const onlyInStock = stock === "1";

    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
    const pageSize = 20;

    // -----------------------------
    // 1) Se stock=1, descobrir card_uids com estoque disponível
    // -----------------------------
    let stockCardUids: string[] | null = null;

    if (onlyInStock) {
      const rawInvRows = await fetchAllRows(
        supabase
          .from("swu_inventory")
          .select("sku_key, qty_on_hand, qty_reserved")
          .gt("qty_on_hand", 0)
      );

      const invRows = (rawInvRows ?? [])
        .map((r: any) => {
          const qtyOnHand = Number(r.qty_on_hand ?? 0);
          const qtyReserved = Number(r.qty_reserved ?? 0);
          const qtyAvailable = Math.max(qtyOnHand - qtyReserved, 0);

          return {
            sku_key: r.sku_key,
            qty_available: qtyAvailable,
          };
        })
        .filter((r: any) => r.sku_key && r.qty_available > 0);

      const skuKeys = Array.from(
        new Set((invRows ?? []).map((r: any) => r.sku_key).filter(Boolean))
      );

      if (skuKeys.length === 0) {
        return NextResponse.json({
          ok: true,
          page,
          pageSize,
          total: 0,
          items: [],
        });
      }

      const skuRows = await batchedInQuery(
        supabase,
        "swu_skus",
        "card_uid, sku_key, promo_type",
        "sku_key",
        skuKeys
      );

      stockCardUids = Array.from(
        new Set((skuRows ?? []).map((r: any) => r.card_uid).filter(Boolean))
      );

      if (stockCardUids.length === 0) {
        return NextResponse.json({
          ok: true,
          page,
          pageSize,
          total: 0,
          items: [],
        });
      }
    }

    // -----------------------------
    // 2) Busca cartas-base (sem paginação ainda)
    // -----------------------------
    let cardsQ = supabase
      .from("swu_cards_ui")
      .select(
        `
        card_uid,
        expansion_code,
        title,
        subtitle,
        card_number,
        card_count,
        artist,
        rarity_label,
        card_type_label,
        aspects_labels,
        traits_labels,
        keywords_labels,
        cost,
        power,
        hp,
        rules_text,
        image_front_url,
        image_back_url,
        image_thumb_url
      `
      );

    if (q) {
      const qEsc = q.replace(/,/g, "\\,");
      cardsQ = cardsQ.or(`title.ilike.%${qEsc}%,subtitle.ilike.%${qEsc}%`);
    }

    if (set) cardsQ = cardsQ.eq("expansion_code", set);
    if (rarity) cardsQ = cardsQ.eq("rarity_label", rarity);
    if (type) cardsQ = cardsQ.eq("card_type_label", type);

    const shouldBatchCardsByStock =
      onlyInStock && stockCardUids && stockCardUids.length > 0;

    if (aspects.length) {
      cardsQ = cardsQ.contains("aspects_labels", toPgArrayLiteral(aspects) as any);
    }

    if (traits.length) {
      cardsQ = cardsQ.contains("traits_labels", toPgArrayLiteral(traits) as any);
    }

    if (keywords.length) {
      cardsQ = cardsQ.contains(
        "keywords_labels",
        toPgArrayLiteral(keywords) as any
      );
    }

    cardsQ = cardsQ
      .order("expansion_code", { ascending: true })
      .order("card_number", { ascending: true });

    let cards: any[] = [];

    if (shouldBatchCardsByStock) {
      cards = await batchedInQuery(
        supabase,
        "swu_cards_ui",
        `
      card_uid,
      expansion_code,
      title,
      subtitle,
      card_number,
      card_count,
      artist,
      rarity_label,
      card_type_label,
      aspects_labels,
      traits_labels,
      keywords_labels,
      cost,
      power,
      hp,
      rules_text,
      image_front_url,
      image_back_url,
      image_thumb_url
    `,
        "card_uid",
        stockCardUids ?? [],
        (query) => {
          if (q) {
            const qEsc = q.replace(/,/g, "\\,");
            query = query.or(`title.ilike.%${qEsc}%,subtitle.ilike.%${qEsc}%`);
          }

          if (set) query = query.eq("expansion_code", set);
          if (rarity) query = query.eq("rarity_label", rarity);
          if (type) query = query.eq("card_type_label", type);

          if (aspects.length) {
            query = query.contains("aspects_labels", toPgArrayLiteral(aspects) as any);
          }

          if (traits.length) {
            query = query.contains("traits_labels", toPgArrayLiteral(traits) as any);
          }

          if (keywords.length) {
            query = query.contains("keywords_labels", toPgArrayLiteral(keywords) as any);
          }

          return query
            .order("expansion_code", { ascending: true })
            .order("card_number", { ascending: true });
        }
      );
    } else {
      cards = await fetchAllRows(cardsQ);
    }

    const cardUids = (cards ?? []).map((c: any) => c.card_uid).filter(Boolean);

    if (cardUids.length === 0) {
      return NextResponse.json({
        ok: true,
        page,
        pageSize,
        total: 0,
        items: [],
      });
    }

    // -----------------------------
    // 3) Busca SKUs / preços / estoque em lotes
    // -----------------------------
    const skus = await batchedInQuery(
      supabase,
      "swu_skus",
      "card_uid, sku_key, finish, condition, promo_type",
      "card_uid",
      cardUids
    );

    const skuKeys = Array.from(
      new Set((skus ?? []).map((s: any) => s.sku_key).filter(Boolean))
    );

    if (skuKeys.length === 0) {
      return NextResponse.json({
        ok: true,
        page,
        pageSize,
        total: 0,
        items: [],
      });
    }

    const prices = await batchedInQuery(
      supabase,
      "swu_price_current",
      "sku_key, price_brl",
      "sku_key",
      skuKeys
    );

    const rawInv = await batchedInQuery(
      supabase,
      "swu_inventory",
      "sku_key, qty_on_hand, qty_reserved",
      "sku_key",
      skuKeys
    );

    const inv = (rawInv ?? []).map((r: any) => {
      const qtyOnHand = Number(r.qty_on_hand ?? 0);
      const qtyReserved = Number(r.qty_reserved ?? 0);
      const qtyAvailable = Math.max(qtyOnHand - qtyReserved, 0);

      return {
        sku_key: r.sku_key,
        qty_available: qtyAvailable,
      };
    });

    const priceBySku = new Map(
      (prices ?? []).map((p: any) => [p.sku_key, Number(p.price_brl)])
    );

    const stockBySku = new Map(
      (inv ?? []).map((i: any) => [i.sku_key, Number(i.qty_available ?? 0)])
    );

    // Agrupa por card_uid + finish
    const byCardFinish = new Map<
      string,
      Map<
        string,
        {
          finish: string;
          variants: Record<
            string,
            { price: number; stock: number; sku_key: string; promo_type: string }
          >;
          stock_total: number;
          recommended_condition: string;
        }
      >
    >();

    for (const s of skus ?? []) {
      const card_uid = (s as any).card_uid as string;
      const finish = (s as any).finish as string;
      const condition = (s as any).condition as string;
      const sku_key = (s as any).sku_key as string;
      const promo_type = (s as any).promo_type as string;

      const price = Number(priceBySku.get(sku_key) ?? 0);
      const stockQty = Number(stockBySku.get(sku_key) ?? 0);

      if (!byCardFinish.has(card_uid)) {
        byCardFinish.set(card_uid, new Map());
      }

      const finishMap = byCardFinish.get(card_uid)!;

      if (!finishMap.has(finish)) {
        finishMap.set(finish, {
          finish,
          variants: {},
          stock_total: 0,
          recommended_condition: "NM",
        });
      }

      const row = finishMap.get(finish)!;

      row.variants[condition] = {
        price,
        stock: stockQty,
        sku_key,
        promo_type,
      };

      row.stock_total += stockQty;
    }

    for (const [, finishMap] of byCardFinish) {
      for (const [, row] of finishMap) {
        row.recommended_condition = pickRecommendedCondition(
          row.variants,
          onlyInStock
        );
      }
    }

    // -----------------------------
    // 4) Constrói items finais
    // -----------------------------
    const items: any[] = [];

    for (const c of cards ?? []) {
      const card_uid = (c as any).card_uid as string;
      const finishMap = byCardFinish.get(card_uid);

      if (!finishMap) continue;

      for (const [, row] of finishMap) {
        if (onlyInStock && (row.stock_total ?? 0) <= 0) continue;

        const recommendedCondition = row.recommended_condition ?? "NM";
        const recommendedVariant = row.variants?.[recommendedCondition];

        const rawRecommendedPrice = Number(recommendedVariant?.price ?? 0);

        const recommendedPrice =
          Number.isFinite(rawRecommendedPrice) && rawRecommendedPrice > 0
            ? rawRecommendedPrice
            : null;

        items.push({
          ...c,
          finish: row.finish,
          variants: row.variants,
          recommended_condition: recommendedCondition,
          has_stock: (row.stock_total ?? 0) > 0,
          stock_total: row.stock_total ?? 0,
          recommended_price: recommendedPrice,
        });
      }
    }

    items.sort((a, b) => {
      const aHasPrice = Number(a.recommended_price ?? 0) > 0;
      const bHasPrice = Number(b.recommended_price ?? 0) > 0;

      if (aHasPrice !== bHasPrice) {
        return aHasPrice ? -1 : 1;
      }

      const priceDiff =
        Number(b.recommended_price ?? 0) - Number(a.recommended_price ?? 0);

      if (priceDiff !== 0) return priceDiff;

      const titleDiff = `${a.title ?? ""}`.localeCompare(`${b.title ?? ""}`);
      if (titleDiff !== 0) return titleDiff;

      return `${a.finish ?? ""}`.localeCompare(`${b.finish ?? ""}`);
    });

    const totalItems = items.length;
    const pagedFrom = (page - 1) * pageSize;
    const pagedTo = pagedFrom + pageSize;
    const pagedItems = items.slice(pagedFrom, pagedTo);

    return NextResponse.json({
      ok: true,
      page,
      pageSize,
      total: totalItems,
      items: pagedItems,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}