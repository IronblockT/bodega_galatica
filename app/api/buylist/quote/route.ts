import { NextResponse } from "next/server";

type BuylistQuoteBody = {
  sku_key: string;
  quantity?: number;
};

const safeJson = async <T = any>(res: Response) => {
  const txt = await res.text().catch(() => "");
  if (!txt || !txt.trim()) return { ok: true, data: null as T | null, raw: txt };
  try {
    return { ok: true, data: JSON.parse(txt) as T, raw: txt };
  } catch {
    return { ok: false, data: null as T | null, raw: txt };
  }
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BuylistQuoteBody;

    const sku_key = String(body?.sku_key ?? "").trim();
    const quantity = Number(body?.quantity ?? 1);

    if (!sku_key) {
      return NextResponse.json(
        { ok: false, error: "sku_key é obrigatório" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { ok: false, error: "quantity deve ser um inteiro maior que zero" },
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

    const rpcRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/calculate_buylist_quote`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_sku_key: sku_key,
          p_quantity: quantity,
        }),
      }
    );

    const parsed = await safeJson<any>(rpcRes);

    if (!rpcRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falha ao calcular quote da buylist",
          detail: parsed.data ?? parsed.raw ?? null,
        },
        { status: 400 }
      );
    }

    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const quote = rows[0] ?? null;

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "Nenhuma quote retornada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      quote,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}