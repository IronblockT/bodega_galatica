import { NextResponse } from "next/server";

type RefreshBody = {
  order_id?: string | null;
  ttl_minutes?: number;
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
    const body = (await req.json()) as RefreshBody;
    const orderId = String(body?.order_id ?? "").trim();

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "order_id é obrigatório" },
        { status: 400 }
      );
    }

    const ttlInput = Number(body?.ttl_minutes ?? 30);

    const ttl = Number.isFinite(ttlInput)
      ? Math.max(5, Math.min(Math.trunc(ttlInput), 120))
      : 30;

    // =====================================================
    // 3) Supabase público + token real do usuário
    // =====================================================
    const supabaseUrl = process.env.SUPABASE_URL;

    const anonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Env vars ausentes (SUPABASE_URL/SUPABASE_ANON_KEY)",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 4) RPC executada como o próprio usuário
    //
    // rpc_checkout_refresh valida internamente:
    // - auth.uid()
    // - ownership do pedido
    // - status permitido
    // =====================================================
    const rpcRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/rpc_checkout_refresh`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_order_id: orderId,
          p_ttl_minutes: ttl,
        }),
        cache: "no-store",
      }
    );

    const txt = await rpcRes.text().catch(() => "");

    let data: unknown = null;

    if (txt) {
      try {
        data = JSON.parse(txt);
      } catch {
        data = txt;
      }
    }

    if (!rpcRes.ok) {
      const detail =
        typeof data === "object" && data !== null
          ? JSON.stringify(data)
          : String(data ?? "");

      const authenticationError =
        rpcRes.status === 401 ||
        detail.includes("not_authenticated");

      const ownershipError =
        detail.includes("order_not_found_or_not_refreshable");

      return NextResponse.json(
        {
          ok: false,
          error: authenticationError
            ? "Sessão inválida ou expirada"
            : ownershipError
              ? "Pedido não encontrado ou não pode ser renovado"
              : "Falha ao renovar reserva",
        },
        {
          status: authenticationError
            ? 401
            : ownershipError
              ? 404
              : 400,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      refresh: data,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Erro interno";

    console.error("[cart.refresh]", e);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}