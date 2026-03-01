import { NextResponse } from "next/server";

type RefreshBody = { order_id: string; ttl_minutes?: number };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RefreshBody;

    if (!body?.order_id) {
      return NextResponse.json({ ok: false, error: "order_id é obrigatório" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const ttl = Math.max(5, Math.min(Number(body.ttl_minutes ?? 30), 120));

    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/rpc_checkout_refresh`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_order_id: body.order_id, p_ttl_minutes: ttl }),
    });

    const txt = await r.text().catch(() => "");
    const data = txt ? JSON.parse(txt) : null;

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: "RPC refresh falhou", detail: data ?? txt }, { status: 400 });
    }

    return NextResponse.json({ ok: true, refresh: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Erro interno" }, { status: 500 });
  }
}