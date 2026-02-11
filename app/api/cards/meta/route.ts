import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // sets
  const { data: sets, error: setErr } = await supabase
    .from("swu_expansions")
    .select("code, name")
    .order("code", { ascending: true });

  if (setErr) return NextResponse.json({ ok: false, error: setErr.message }, { status: 500 });

  // types (já limpos da view)
  const { data: typesRows, error: typeErr } = await supabase
    .from("swu_cards_ui")
    .select("card_type_label")
    .not("card_type_label", "is", null);

  if (typeErr) return NextResponse.json({ ok: false, error: typeErr.message }, { status: 500 });

  // rarities (já limpos da view)
  const { data: rarRows, error: rarErr } = await supabase
    .from("swu_cards_ui")
    .select("rarity_label")
    .not("rarity_label", "is", null);

  if (rarErr) return NextResponse.json({ ok: false, error: rarErr.message }, { status: 500 });

  const uniq = (arr: (string | null | undefined)[]) =>
    Array.from(new Set(arr.map((x) => x?.trim()).filter(Boolean) as string[])).sort();

  const types = uniq((typesRows ?? []).map((x: any) => x.card_type_label));
  const rarities = uniq((rarRows ?? []).map((x: any) => x.rarity_label));

  return NextResponse.json({
    ok: true,
    sets: sets ?? [],
    types,
    rarities,
  });
}
