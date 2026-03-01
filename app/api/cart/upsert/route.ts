import { NextResponse } from "next/server";

type UpsertCartBody = {
  user_id: string;
  items: Array<{ sku_key: string; qty: number }>;
  order_id?: string | null;          // opcional: reaproveitar carrinho existente
  idempotency_key?: string | null;   // opcional: se quiser
  ttl_minutes?: number | null;       // default 30
};

type PriceRow = { sku_key: string; price_brl: number | string | null };

const asNumber = (v: any) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Number(n) : NaN;
};

// PostgREST in.(...) com valores entre aspas e urlencoded
const buildInFilter = (values: string[]) => {
  const quoted = values.map((v) => `"${v.replaceAll('"', '\\"')}"`).join(",");
  return encodeURIComponent(`(${quoted})`);
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
    const body = (await req.json()) as UpsertCartBody;

    if (!body?.user_id) {
      return NextResponse.json({ ok: false, error: "user_id é obrigatório" }, { status: 400 });
    }
    if (!body?.items?.length) {
      return NextResponse.json({ ok: false, error: "Carrinho vazio" }, { status: 400 });
    }
    if (body.items.some((i) => !i.sku_key || !i.qty || i.qty <= 0)) {
      return NextResponse.json({ ok: false, error: "Itens inválidos (sku_key/qty)" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: "Env vars ausentes (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const sb = async (path: string, init: RequestInit) => {
      const method = (init.method ?? "GET").toUpperCase();
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
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

    const callRpc = async (fn: string, payload: any) => {
      return fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    };

    // 1) Preço por SKU (swu_price_current)
    const skus = body.items.map((i) => i.sku_key);
    const skuIn = buildInFilter(skus);

    const priceRes = await sb(
      `swu_price_current?select=sku_key,price_brl&sku_key=in.${skuIn}`,
      { method: "GET" }
    );
    const priceRows = (await priceRes.json()) as PriceRow[];

    const priceBySku = new Map(priceRows.map((r) => [r.sku_key, asNumber(r.price_brl ?? 0)]));
    const missingPrice = skus.filter((s) => !priceBySku.has(s) || !Number.isFinite(priceBySku.get(s)) || (priceBySku.get(s) ?? 0) <= 0);

    if (missingPrice.length) {
      return NextResponse.json(
        { ok: false, error: "Preço indisponível para SKU(s)", detail: { missingPrice } },
        { status: 409 }
      );
    }

    // 2) Garantir order_id (reaproveita se vier, senão cria)
    let orderId = (body.order_id ?? "").trim();

    if (orderId) {
      // valida ownership básico (service role) — só confirma que existe e pertence ao user
      const chk = await sb(
        `orders?select=id,status&user_id=eq.${encodeURIComponent(body.user_id)}&id=eq.${encodeURIComponent(orderId)}&limit=1`,
        { method: "GET" }
      );
      const rows = (await chk.json()) as any[];
      if (!rows?.[0]?.id) orderId = "";
    }

    if (!orderId) {
      const ins = await sb("orders?select=id", {
        method: "POST",
        body: JSON.stringify({
          user_id: body.user_id,
          idempotency_key: body.idempotency_key?.trim() || null,
          status: "draft",
          subtotal_brl: 0,
          shipping_brl: 0,
          discount_brl: 0,
          total_brl: 0,
          currency: "BRL",
        }),
      });
      const rows = (await ins.json()) as any[];
      orderId = rows?.[0]?.id;
      if (!orderId) throw new Error("orders insert: não retornou id");
    }

    // 3) Chama reserve (isso: libera reserva anterior + recria itens + reserva estoque + recalcula totals)
    const ttl = Math.max(5, Math.min(Number(body.ttl_minutes ?? 30), 120));

    const rpcPayload = {
      p_order_id: orderId,
      p_items: body.items.map((x) => ({
        sku_key: x.sku_key,
        qty: x.qty,
        unit_price_brl: priceBySku.get(x.sku_key),
        snapshot: {
          sku_key: x.sku_key,
          unit_price_brl: priceBySku.get(x.sku_key),
        },
      })),
      p_ttl_minutes: ttl,
    };

    const reserveRes = await callRpc("rpc_checkout_reserve", rpcPayload);
    const parsed = await safeJson<any>(reserveRes);
    if (!reserveRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Falha ao reservar estoque", detail: parsed.data ?? parsed.raw ?? null },
        { status: 409 }
      );
    }
    if (parsed.data?.ok === false) {
      return NextResponse.json(
        { ok: false, error: "Sem estoque para um ou mais itens", detail: parsed.data },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      reserve: parsed.data ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Erro interno" }, { status: 500 });
  }
}