import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return false;
  }

  const authHeader = req.headers.get("authorization") ?? "";

  return authHeader === `Bearer ${expectedSecret}`;
}

async function runCleanup(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { ok: false, error: "Não autorizado" },
        { status: 401 }
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

    const r = await fetch(
      `${supabaseUrl}/rest/v1/rpc/rpc_inventory_release_expired`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );

    const txt = await r.text().catch(() => "");

    let data: unknown = null;

    try {
      data = txt ? JSON.parse(txt) : null;
    } catch {
      data = txt;
    }

    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "RPC cleanup falhou",
          detail: data,
        },
        { status: 400 }
      );
    }

    console.log("[cart/cleanup] cleanup executed", {
      ran_at: new Date().toISOString(),
      result: data,
    });

    return NextResponse.json({
      ok: true,
      cleanup: data,
      ran_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return runCleanup(req);
}

export async function POST(req: Request) {
  return runCleanup(req);
}