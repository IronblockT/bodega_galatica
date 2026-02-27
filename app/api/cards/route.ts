import { NextResponse } from "next/server";

function toArrayParam(v: string | null) {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toPgArrayLiteral(arr: string[]) {
  // {"Vigilance","Heroism"}
  const escaped = arr.map((s) =>
    `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );
  return `{${escaped.join(",")}}`;
}

const CONDITION_ORDER = ["NM", "LP", "MP", "HP", "DMG"] as const;

function pickRecommendedCondition(variants: Record<string, { stock?: number }>) {
  for (const c of CONDITION_ORDER) {
    const s = Number(variants?.[c]?.stock ?? 0);
    if (s > 0) return c;
  }
  return "NM";
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
    const set = searchParams.get("set"); // expansion_code
    const rarity = searchParams.get("rarity"); // rarity_label
    const type = searchParams.get("type"); // card_type_label

    const aspects = toArrayParam(searchParams.get("aspects"));
    const traits = toArrayParam(searchParams.get("traits"));
    const keywords = toArrayParam(searchParams.get("keywords"));

    const stock = searchParams.get("stock"); // "1" ou null

    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(searchParams.get("pageSize") ?? "10", 10), 1),
      50
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // -----------------------------
    // 1) Se stock=1, vamos descobrir card_uids com estoque disponível (pequeno, ~313 linhas hoje)
    // -----------------------------
    let stockCardUids: string[] | null = null;

    if (stock === "1") {
      // pega SKUs com qty_available > 0
      const { data: invRows, error: invErr } = await supabase
        .from("swu_inventory_ui")
        .select("sku_key, qty_available")
        .gt("qty_available", 0);

      if (invErr) {
        return NextResponse.json(
          { ok: false, error: invErr.message },
          { status: 500 }
        );
      }

      const skuKeys = Array.from(
        new Set((invRows ?? []).map((r: any) => r.sku_key).filter(Boolean))
      );

      if (skuKeys.length === 0) {
        // ninguém em estoque -> retorna vazio rápido
        return NextResponse.json({
          ok: true,
          page,
          pageSize,
          total: 0,
          items: [],
        });
      }

      // mapeia sku_key -> card_uid via swu_skus
      const { data: skuRows, error: skuErr } = await supabase
        .from("swu_skus")
        .select("card_uid, sku_key, promo_type")
        .in("sku_key", skuKeys)
        .eq("promo_type", "regular");

      if (skuErr) {
        return NextResponse.json(
          { ok: false, error: skuErr.message },
          { status: 500 }
        );
      }

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
    // 2) Busca página de cartas (view leve)
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
      `,
        { count: "exact" }
      );

    if (q) {
      // NÃO use encodeURIComponent aqui (isso piora e quebra). Só escapa vírgula pro .or()
      const qEsc = q.replace(/,/g, "\\,");
      cardsQ = cardsQ.or(`title.ilike.%${qEsc}%,subtitle.ilike.%${qEsc}%`);
    }
    if (set) cardsQ = cardsQ.eq("expansion_code", set);
    if (rarity) cardsQ = cardsQ.eq("rarity_label", rarity);
    if (type) cardsQ = cardsQ.eq("card_type_label", type);

    if (stockCardUids) {
      // filtra apenas cards com estoque
      cardsQ = cardsQ.in("card_uid", stockCardUids);
    }

    if (aspects.length)
      cardsQ = cardsQ.contains("aspects_labels", toPgArrayLiteral(aspects) as any);
    if (traits.length)
      cardsQ = cardsQ.contains("traits_labels", toPgArrayLiteral(traits) as any);
    if (keywords.length)
      cardsQ = cardsQ.contains(
        "keywords_labels",
        toPgArrayLiteral(keywords) as any
      );

    cardsQ = cardsQ
      .order("expansion_code", { ascending: true })
      .order("card_number", { ascending: true })
      .range(from, to);

    const { data: cards, error: cardsErr, count } = await cardsQ;

    if (cardsErr) {
      return NextResponse.json(
        { ok: false, error: cardsErr.message },
        { status: 500 }
      );
    }

    const cardUids = (cards ?? []).map((c: any) => c.card_uid).filter(Boolean);

    if (cardUids.length === 0) {
      return NextResponse.json({
        ok: true,
        page,
        pageSize,
        total: count ?? 0,
        items: [],
      });
    }

    // -----------------------------
    // 3) Para esses card_uids, monta "linhas" por finish + variants (condições)
    // -----------------------------
    const { data: skus, error: skusErr } = await supabase
      .from("swu_skus")
      .select("card_uid, sku_key, finish, condition, promo_type")
      .in("card_uid", cardUids)
      .eq("promo_type", "regular");

    if (skusErr) {
      return NextResponse.json(
        { ok: false, error: skusErr.message },
        { status: 500 }
      );
    }

    const skuKeys = Array.from(
      new Set((skus ?? []).map((s: any) => s.sku_key).filter(Boolean))
    );

    // preços
    const { data: prices, error: pricesErr } = await supabase
      .from("swu_price_current")
      .select("sku_key, price_brl")
      .in("sku_key", skuKeys);

    if (pricesErr) {
      return NextResponse.json(
        { ok: false, error: pricesErr.message },
        { status: 500 }
      );
    }

    // estoque (qty_available)
    const { data: inv, error: invErr2 } = await supabase
      .from("swu_inventory_ui")
      .select("sku_key, qty_available")
      .in("sku_key", skuKeys);

    if (invErr2) {
      return NextResponse.json(
        { ok: false, error: invErr2.message },
        { status: 500 }
      );
    }

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

      if (!byCardFinish.has(card_uid)) byCardFinish.set(card_uid, new Map());
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

    // finaliza recommended_condition
    for (const [, finishMap] of byCardFinish) {
      for (const [, row] of finishMap) {
        row.recommended_condition = pickRecommendedCondition(row.variants);
      }
    }

    // -----------------------------
    // 4) Constrói items: um row por (card_uid, finish)
    // -----------------------------
    const items: any[] = [];

    for (const c of cards ?? []) {
      const card_uid = (c as any).card_uid as string;
      const finishMap = byCardFinish.get(card_uid);

      if (!finishMap) continue;

      for (const [, row] of finishMap) {
        // se stock=1, garante que esse finish tem estoque
        if (stock === "1" && (row.stock_total ?? 0) <= 0) continue;

        items.push({
          ...c,
          finish: row.finish,
          variants: row.variants,
          recommended_condition: row.recommended_condition,
          has_stock: (row.stock_total ?? 0) > 0,
          stock_total: row.stock_total ?? 0,
        });
      }
    }

    // Ordena (só pra estabilidade visual)
    items.sort((a, b) => {
      const aKey = `${a.expansion_code ?? ""}`.localeCompare(`${b.expansion_code ?? ""}`);
      if (aKey !== 0) return aKey;
      const n = Number(a.card_number ?? 0) - Number(b.card_number ?? 0);
      if (n !== 0) return n;
      return `${a.finish ?? ""}`.localeCompare(`${b.finish ?? ""}`);
    });

    return NextResponse.json({
      ok: true,
      page,
      pageSize,
      total: count ?? 0,
      items,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}