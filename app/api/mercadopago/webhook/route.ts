import { NextResponse } from "next/server";
import crypto from "crypto";

// >>> Ajuste este verificador conforme o padrão exato do Mercado Pago na tua conta/painel.
// Os headers citados são os usados pelo MP para assinatura/verificação. :contentReference[oaicite:4]{index=4}
function parseXSignature(xSignature: string) {
  // Ex: "ts=1700000000,v1=abcdef..."
  const parts = xSignature.split(",").map((p) => p.trim());
  const ts = parts.find((p) => p.startsWith("ts="))?.slice(3) ?? null;
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3) ?? null;
  return { ts, v1 };
}

function verifyMpSignature(req: Request, rawBody: string, paymentId: string) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  // ✅ agora exigimos request-id também
  if (!xSignature || !xRequestId || !paymentId) return false;

  const { ts, v1 } = parseXSignature(xSignature);
  if (!ts || !v1) return false;

  // Normaliza
  const received = String(v1).trim().toLowerCase();

  // Formato A (manifest) — muito comum
  const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
  const computedA = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  // Formato B (raw body) — outro formato comum em webhooks HMAC
  const baseB = `${ts}.${xRequestId}.${rawBody}`;
  const computedB = crypto.createHmac("sha256", secret).update(baseB).digest("hex");

  // Compare timing-safe (como string)
  const safeEq = (a: string, b: string) => {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  };

  return safeEq(received, computedA.toLowerCase()) || safeEq(received, computedB.toLowerCase());
}

export async function GET() {
  // Healthcheck do Mercado Pago (e útil pra você também)
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  // tenta parsear JSON (se não for JSON, segue vazio)
  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch { }

  // identificar payment id (varia por formato)
  const paymentId =
    payload?.data?.id ??
    payload?.id ??
    (typeof payload?.resource === "string" ? payload.resource.split("/").pop() : null);

  // se não tem paymentId, não dá pra validar assinatura pelo manifest
  if (!paymentId) {
    return NextResponse.json({ received: true });
  }

  // ✅ valida assinatura (agora obrigatório)
  const okSig = verifyMpSignature(req, rawBody, String(paymentId));

  console.log("[MP webhook] headers", {
    hasSecret: !!process.env.MP_WEBHOOK_SECRET,
    xRequestId: req.headers.get("x-request-id"),
    xSignature: req.headers.get("x-signature"),
    paymentId: String(paymentId),
    bodyLen: rawBody.length,
  });

  if (!okSig) {
    const sig = req.headers.get("x-signature") ?? "";
    const maskedSig =
      sig.length > 20 ? `${sig.slice(0, 12)}...${sig.slice(-8)}` : sig;

    console.log("[MP webhook] Invalid signature", {
      hasSecret: !!process.env.MP_WEBHOOK_SECRET,
      paymentId: String(paymentId),
      xRequestId: req.headers.get("x-request-id"),
      xSignatureMasked: maskedSig,
      bodyLen: rawBody.length,
    });

    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 4) buscar detalhes do pagamento na API do MP (fonte de verdade)
  const mpAccessToken = process.env.MP_ACCESS_TOKEN!;
  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` },
  });

  if (!payRes.ok) {
    // responde 200 para não ficar re-tentando agressivamente, mas loga no server
    return NextResponse.json({ received: true });
  }

  const payment = await payRes.json();
  const status = payment.status; // approved, rejected, pending...
  const cartId = payment.external_reference; // a gente setou como cartId

  if (!cartId) {
    return NextResponse.json({ received: true });
  }

  const providerPaymentId = String(payment.id);
  const providerPaymentStatus = String(payment.status ?? "");
  const providerPaymentUpdatedAt =
    payment.date_last_updated || payment.date_approved || payment.date_created || null;

  // 5) atualizar Supabase conforme status
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;


  const sb = async (path: string, init: RequestInit) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Supabase error ${res.status}: ${t}`);
    }
    return res;
  };

  // tenta achar payment row pelo provider_payment_id
  const q = `payments?select=id,order_id,provider_payment_status,provider_payment_updated_at`
    + `&provider=eq.mercadopago`
    + `&provider_payment_id=eq.${encodeURIComponent(providerPaymentId)}`
    + `&limit=1`;

  const existingRes = await sb(q, { method: "GET" });
  const existing = (await existingRes.json()) as any[];
  const existingRow = existing?.[0];

  // Se já existe e status + updated_at são iguais => já processamos este evento
  if (
    existingRow &&
    String(existingRow.provider_payment_status ?? "") === providerPaymentStatus &&
    String(existingRow.provider_payment_updated_at ?? "") === String(providerPaymentUpdatedAt ?? "")
  ) {
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Caso não exista, ou mudou status/updated_at: registra (upsert)
  // Como temos índice unique(provider, provider_payment_id), dá pra tentar inserir e, se falhar, dar PATCH
  try {
    await sb("payments", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        // order_id vem do external_reference (no seu fluxo ele é o orderId)
        order_id: cartId,
        provider: "mercadopago",
        status: providerPaymentStatus === "approved" ? "paid" : "pending",
        provider_payment_id: providerPaymentId,
        provider_payment_status: providerPaymentStatus,
        provider_payment_updated_at: providerPaymentUpdatedAt,
        provider_payload: payment,
        amount_brl: payment.transaction_amount ?? null,
        currency: payment.currency_id ?? "BRL",
      }),
    });
  } catch {
    // se já existia, atualiza
    await sb(
      `payments?provider=eq.mercadopago&provider_payment_id=eq.${encodeURIComponent(providerPaymentId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          provider_payment_status: providerPaymentStatus,
          provider_payment_updated_at: providerPaymentUpdatedAt,
          provider_payload: payment,
        }),
      }
    );
  }

  const rpc = async (fn: string, body: any) => {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r;
  };

  // Exemplo de decisão:
  if (status === "approved") {
    // confirma pedido: marca cart como paid + gera order/sales etc via RPC
    await rpc("finalize_cart_after_payment", {
      p_cart_id: cartId,
      p_payment_id: String(payment.id),
      p_payment_status: status,
      p_amount: payment.transaction_amount,
      p_payload: payment,
    });
  } else if (status === "rejected" || status === "cancelled") {
    await rpc("release_cart_stock", { p_cart_id: cartId });
    await rpc("mark_cart_payment_failed", {
      p_cart_id: cartId,
      p_payment_id: String(payment.id),
      p_payment_status: status,
      p_payload: payment,
    });
  } else {
    // pending, in_process etc: apenas salva status
    await rpc("mark_cart_payment_pending", {
      p_cart_id: cartId,
      p_payment_id: String(payment.id),
      p_payment_status: status,
      p_payload: payment,
    });
  }

  return NextResponse.json({ received: true });
}
