import { NextResponse } from "next/server";

type Body = {
  order_id?: string | null;
};

export async function POST(req: Request) {
  try {
    // =====================================================
    // 1) Exige sessão autenticada
    // =====================================================
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing auth token" },
        { status: 401 }
      );
    }

    // =====================================================
    // 2) Valida payload
    // =====================================================
    const body = (await req.json()) as Body;
    const orderId = String(body?.order_id ?? "").trim();

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "order_id é obrigatório" },
        { status: 400 }
      );
    }

    // =====================================================
    // 3) Configuração Supabase
    // =====================================================
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        {
          ok: false,
          error: "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 4) Descobre o usuário real pelo access token
    // =====================================================
    const meRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey || serviceRole,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!meRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Sessão inválida ou expirada" },
        { status: 401 }
      );
    }

    const me = await meRes.json();
    const userId = String(me?.id ?? "").trim();

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Usuário inválido" },
        { status: 401 }
      );
    }

    // =====================================================
    // 5) Confirma que o pedido pertence ao usuário
    // =====================================================
    const orderRes = await fetch(
      `${supabaseUrl}/rest/v1/orders` +
      `?select=id,status,user_id` +
      `&id=eq.${encodeURIComponent(orderId)}` +
      `&user_id=eq.${encodeURIComponent(userId)}` +
      `&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
        },
        cache: "no-store",
      }
    );

    if (!orderRes.ok) {
      const detail = await orderRes.text().catch(() => "");

      return NextResponse.json(
        {
          ok: false,
          error: "Falha ao validar pedido",
          detail,
        },
        { status: 500 }
      );
    }

    const orders = (await orderRes.json()) as Array<{
      id: string;
      status: string;
      user_id: string;
    }>;

    const order = orders?.[0];

    if (!order?.id) {
      // Não diferencia "não existe" de "pertence a outro usuário".
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    if (!["draft", "reserved"].includes(order.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Pedido não pode mais ser liberado",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // 6) Libera reservas
    // =====================================================
    const rpcRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/rpc_checkout_release_user`,
      {
        method: "POST",
        headers: {
          apikey: anonKey || serviceRole,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_order_id: orderId,
        }),
      }
    );

    const rpcTxt = await rpcRes.text().catch(() => "");

    let rpcData: unknown = null;

    if (rpcTxt) {
      try {
        rpcData = JSON.parse(rpcTxt);
      } catch {
        rpcData = rpcTxt;
      }
    }

    if (!rpcRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falha ao liberar reserva",
          detail: rpcData,
        },
        { status: 400 }
      );
    }    

    return NextResponse.json({
      ok: true,
      release: rpcData,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Erro interno";

    console.error("[cart.release]", e);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}