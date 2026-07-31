import { NextResponse } from "next/server";

type OrderRow = {
  id: string;
  user_id: string;
  status: string;
};

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "Sessão não autenticada" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const orderId = String(url.searchParams.get("order_id") ?? "").trim();

    if (!orderId) {
      return NextResponse.json(
        { error: "order_id é obrigatório" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error:
            "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY)",
        },
        { status: 500 }
      );
    }

    // Valida o token e obtém a identidade real do usuário.
    const meRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!meRes.ok) {
      return NextResponse.json(
        { error: "Sessão inválida ou expirada" },
        { status: 401 }
      );
    }

    const me = (await meRes.json()) as {
      id?: string | null;
    };

    const userId = String(me?.id ?? "").trim();

    if (!userId) {
      return NextResponse.json(
        { error: "Usuário inválido" },
        { status: 401 }
      );
    }

    // Service role é usado somente no servidor.
    // O filtro por user_id impede consultar pedido de outro usuário.
    const params = new URLSearchParams({
      select: "id,user_id,status",
      id: `eq.${orderId}`,
      user_id: `eq.${userId}`,
      limit: "1",
    });

    const orderRes = await fetch(
      `${supabaseUrl}/rest/v1/orders?${params.toString()}`,
      {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      }
    );

    if (!orderRes.ok) {
      const detail = await orderRes.text().catch(() => "");

      console.error("[checkout/status] order query failed", {
        orderId,
        userId,
        status: orderRes.status,
        detail,
      });

      return NextResponse.json(
        { error: "Falha ao consultar pedido" },
        { status: 500 }
      );
    }

    const rows = (await orderRes.json()) as OrderRow[];
    const order = rows[0] ?? null;

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        order_id: order.id,
        status: order.status,
        paid: order.status === "paid",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[checkout/status] unexpected error", err);

    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}