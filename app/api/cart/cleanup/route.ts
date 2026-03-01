import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/rpc_inventory_release_expired`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const txt = await r.text().catch(() => "");
    const data = txt ? JSON.parse(txt) : null;

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: "RPC cleanup falhou", detail: data ?? txt }, { status: 400 });
    }

    return NextResponse.json({ ok: true, cleanup: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Erro interno" }, { status: 500 });
  }
}