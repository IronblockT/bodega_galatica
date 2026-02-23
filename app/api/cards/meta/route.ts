import { NextResponse } from "next/server";

export async function GET() {

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

  const { data: sets, error: setErr } = await supabase
    .from("swu_expansions")
    .select("code, name")
    .order("code", { ascending: true });


  if (setErr) return NextResponse.json({ ok: false, error: setErr.message }, { status: 500 });

  // types (já limpos da view)
  const { data: typesRows, error: typeErr } = await supabase
    .from("swu_meta_types")
    .select("card_type_label");

  if (typeErr) return NextResponse.json({ ok: false, error: typeErr.message }, { status: 500 });

  const { data: rarRows, error: rarErr } = await supabase
    .from("swu_meta_rarities")
    .select("rarity_label");

  if (rarErr) return NextResponse.json({ ok: false, error: rarErr.message }, { status: 500 });

  const uniq = (arr: (string | null | undefined)[]) =>
    Array.from(new Set(arr.map((x) => x?.trim()).filter(Boolean) as string[])).sort();

  const types = uniq((typesRows ?? []).map((x: any) => x.card_type_label));
  const rarities = uniq((rarRows ?? []).map((x: any) => x.rarity_label));

  return NextResponse.json(
    {
      ok: true,
      sets: sets ?? [],
      types,
      rarities,
    },
    {
      headers: {
        // 10 min no CDN + serve stale enquanto revalida
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    }
  );
}
