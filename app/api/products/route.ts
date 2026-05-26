// app/api/products/route.ts
import { NextResponse } from "next/server";

function normalizeCategory(value: string | null) {
  const v = String(value ?? "").trim().toLowerCase();
  return v || null;
}

function normalizeSet(value: string | null) {
  const v = String(value ?? "").trim().toUpperCase();
  return v || null;
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
        {
          ok: false,
          error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY",
        },
        { status: 500 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseAnon);

    const q = String(searchParams.get("q") ?? "").trim();
    const category = normalizeCategory(searchParams.get("category"));
    const set = normalizeSet(searchParams.get("set"));
    const stock = searchParams.get("stock");

    let query = supabase
      .from("products_ui")
      .select(
        `
        id,
        slug,
        name,
        category,
        expansion_code,
        description,
        image_url,
        price_brl,
        active,
        qty_on_hand,
        qty_reserved,
        qty_available,
        created_at,
        updated_at
      `
      )
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (q) {
      const qEsc = q.replace(/,/g, "\\,");
      query = query.or(`name.ilike.%${qEsc}%,description.ilike.%${qEsc}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (set) {
      query = query.eq("expansion_code", set);
    }

    if (stock === "1") {
      query = query.gt("qty_available", 0);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}