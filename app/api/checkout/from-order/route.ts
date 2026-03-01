import { NextResponse } from "next/server";

type Body = {
  order_id: string;
  payer?: { email?: string; name?: string };
  idempotency_key?: string; // opcional
};

const safeJson = async <T = any>(res: Response) => {
  const txt = await res.text();
  if (!txt || !txt.trim()) return { ok: true, data: null as T | null, raw: txt };
  try {
    return { ok: true, data: JSON.parse(txt) as T, raw: txt };
  } catch {
    return { ok: false, data: null as T | null, raw: txt };
  }
};

const mustJson = async <T = any>(res: Response, label: string) => {
  const parsed = await safeJson<T>(res);
  if (!parsed.ok) {
    throw new Error(
      `${label}: resposta não é JSON. HTTP ${res.status}. Body: ${parsed.raw.slice(0, 500)}`
    );
  }
  return parsed.data;
};

function isEditableStatus(s: string) {
  return ["draft", "reserved", "awaiting_payment"].includes(String(s ?? ""));
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing auth token" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const orderId = String(body?.order_id ?? "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "order_id é obrigatório" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const appUrl = process.env.APP_URL!;
    const mpAccessToken = process.env.MP_ACCESS_TOKEN!;

    const anonKey =
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRole || !appUrl || !mpAccessToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/APP_URL/MP_ACCESS_TOKEN)",
        },
        { status: 500 }
      );
    }

    // 1) userId via JWT (GoTrue)
    const meRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey || serviceRole,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!meRes.ok) {
      const t = await meRes.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Auth failed: ${t}` }, { status: 401 });
    }

    const me = await meRes.json();
    const userId = me?.id as string | undefined;
    if (!userId) return NextResponse.json({ ok: false, error: "Invalid user" }, { status: 401 });

    const sb = async (path: string, init: RequestInit) => {
      const method = (init.method ?? "GET").toUpperCase();
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          "Content-Type": "application/json",
          ...(method !== "GET" ? { Prefer: "return=representation" } : {}),
          ...(init.headers || {}),
        },
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Supabase error ${res.status}: ${t}`);
      }
      return res;
    };

    // 2) Confere order é do usuário e status é editável
    const orderRes = await sb(
      `orders?select=id,user_id,status,total_brl,currency&user_id=eq.${encodeURIComponent(
        userId
      )}&id=eq.${encodeURIComponent(orderId)}&limit=1`,
      { method: "GET" }
    );
    const orders = (await orderRes.json()) as any[];
    const order = orders?.[0];

    if (!order?.id) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado" }, { status: 404 });
    }
    if (!isEditableStatus(order.status)) {
      return NextResponse.json(
        { ok: false, error: `Pedido não está em status editável (${order.status})` },
        { status: 409 }
      );
    }

    // 3) Se já existe payment MP pending com preference_id, devolve init_point (idempotência)
    // (isso evita recriar preference quando usuário clica 2x)
    const payRes = await sb(
      `payments?select=provider_preference_id,provider_payload,status&order_id=eq.${encodeURIComponent(
        orderId
      )}&provider=eq.mercadopago&limit=1`,
      { method: "GET" }
    );
    const pays = (await payRes.json()) as any[];
    const pay = pays?.[0];

    if (pay?.provider_preference_id && pay?.provider_payload?.init_point) {
      return NextResponse.json({
        ok: true,
        order_id: orderId,
        preference_id: pay.provider_preference_id,
        init_point: pay.provider_payload.init_point,
        idempotent: true,
        status: order.status ?? null,
      });
    }

    // 4) Busca order_items para montar items do MP
    const itemsRes = await sb(
      `order_items?select=sku_key,qty,unit_price_brl,item_snapshot&order_id=eq.${encodeURIComponent(
        orderId
      )}`,
      { method: "GET" }
    );
    const orderItems = (await itemsRes.json()) as any[];

    if (!orderItems?.length) {
      return NextResponse.json(
        { ok: false, error: "Pedido sem itens (reserve primeiro)" },
        { status: 409 }
      );
    }

    const mpItems = orderItems.map((it) => {
      const snap = it.item_snapshot ?? {};
      const title = snap.title ?? it.sku_key;
      return {
        title,
        quantity: Number(it.qty ?? 0),
        unit_price: Number(it.unit_price_brl ?? 0),
        currency_id: "BRL",
      };
    });

    // 5) Cria preference MP
    const prefBody = {
      items: mpItems,
      external_reference: orderId,
      notification_url: `${appUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${appUrl}/checkout/success?order=${orderId}`,
        failure: `${appUrl}/checkout/failure?order=${orderId}`,
        pending: `${appUrl}/checkout/pending?order=${orderId}`,
      },
      auto_return: "approved",
      payer: body.payer?.email ? { email: body.payer.email } : undefined,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prefBody),
    });

    if (!mpRes.ok) {
      const t = await mpRes.text().catch(() => "");
      return NextResponse.json({ ok: false, error: "Falha ao criar checkout", detail: t }, { status: 502 });
    }

    const mpPref = await mustJson<any>(mpRes, "mercadopago preferences");
    if (!mpPref?.id || !mpPref?.init_point) {
      return NextResponse.json(
        { ok: false, error: "Mercado Pago retornou JSON sem id/init_point" },
        { status: 502 }
      );
    }

    // 6) Atualiza order -> awaiting_payment
    await sb(`orders?id=eq.${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "awaiting_payment" }),
    });

    // 7) Insere payment pending (tem check constraint p/ status, então 'pending' ok)
    await sb("payments", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        provider: "mercadopago",
        status: "pending",
        provider_preference_id: mpPref.id,
        amount_brl: Number(order.total_brl ?? 0),
        currency: order.currency ?? "BRL",
        provider_payload: mpPref,
      }),
    });

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      preference_id: mpPref.id,
      init_point: mpPref.init_point,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Erro interno" }, { status: 500 });
  }
}