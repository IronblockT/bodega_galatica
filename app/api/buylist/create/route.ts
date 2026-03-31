import { NextResponse } from "next/server";

type CreateBuylistBody = {
  user_id: string;
  sku_key: string;
  quantity: number;
  payout_type: "cash" | "store_credit";
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
    const body = (await req.json()) as CreateBuylistBody;

    const user_id = String(body?.user_id ?? "").trim();
    const sku_key = String(body?.sku_key ?? "").trim();
    const quantity = Number(body?.quantity ?? 0);
    const payout_type = body?.payout_type;

    if (!user_id) {
      return NextResponse.json({ ok: false, error: "user_id é obrigatório" }, { status: 400 });
    }

    if (!sku_key) {
      return NextResponse.json({ ok: false, error: "sku_key é obrigatório" }, { status: 400 });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { ok: false, error: "quantity deve ser um inteiro maior que zero" },
        { status: 400 }
      );
    }

    if (payout_type !== "cash" && payout_type !== "store_credit") {
      return NextResponse.json(
        { ok: false, error: "payout_type deve ser cash ou store_credit" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const rpcRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/create_buylist_offer_single`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_user_id: user_id,
          p_sku_key: sku_key,
          p_quantity: quantity,
          p_requested_payout_type: payout_type,
        }),
      }
    );

    const parsed = await safeJson<any>(rpcRes);

    if (!rpcRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falha ao criar oferta de buylist",
          detail: parsed.data ?? parsed.raw ?? null,
        },
        { status: 400 }
      );
    }

    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const offer = rows[0] ?? null;

    if (!offer) {
      return NextResponse.json(
        { ok: false, error: "Nenhuma oferta foi retornada" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      offer,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}