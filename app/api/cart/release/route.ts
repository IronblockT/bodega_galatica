import { NextResponse } from "next/server";

type Body = {
  order_id?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const orderId = String(body?.order_id ?? "").trim();

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "order_id é obrigatório" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)",
        },
        { status: 500 }
      );
    }

    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/rpc_checkout_release`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_order_id: orderId }),
    });

    const rpcTxt = await rpcRes.text().catch(() => "");
    const rpcData = rpcTxt ? JSON.parse(rpcTxt) : null;

    if (!rpcRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Falha ao liberar reserva", detail: rpcData ?? rpcTxt },
        { status: 400 }
      );
    }

    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
    }).catch(() => null);

    return NextResponse.json({ ok: true, release: rpcData });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}