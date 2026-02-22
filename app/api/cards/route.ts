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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  const aspects = toArrayParam(searchParams.get("aspects")); // csv
  const traits = toArrayParam(searchParams.get("traits"));
  const keywords = toArrayParam(searchParams.get("keywords"));

  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
  const pageSize = Math.min(
    Math.max(parseInt(searchParams.get("pageSize") ?? "24", 10), 1),
    60
  );

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
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
      image_back_url
      `,
      { count: "exact" }
    );

  // filtros básicos
  if (q) {
    const qEsc = q.replace(/,/g, "\\,"); // evita quebrar o .or() (vírgula é separador)
    query = query.or(`title.ilike.%${qEsc}%,subtitle.ilike.%${qEsc}%`);
  }
  if (set) query = query.eq("expansion_code", set);
  if (rarity) query = query.eq("rarity_label", rarity);
  if (type) query = query.eq("card_type_label", type);

  // filtros array (text[])
  if (aspects.length) query = query.contains("aspects_labels", toPgArrayLiteral(aspects) as any);
  if (traits.length) query = query.contains("traits_labels", toPgArrayLiteral(traits) as any);
  if (keywords.length) query = query.contains("keywords_labels", toPgArrayLiteral(keywords) as any);

  // ordenação
  query = query
    .order("expansion_code", { ascending: true })
    .order("card_number", { ascending: true });

  // paginação
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    page,
    pageSize,
    total: count ?? 0,
    items: data ?? [],
  });
}
