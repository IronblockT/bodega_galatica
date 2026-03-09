import { NextResponse } from "next/server";
import crypto from "crypto";

function parseXSignature(xSignature: string) {
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

  if (!xSignature || !xRequestId || !paymentId) return false;

  const { ts, v1 } = parseXSignature(xSignature);
  if (!ts || !v1) return false;

  const received = String(v1).trim().toLowerCase();

  const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
  const computedA = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const baseB = `${ts}.${xRequestId}.${rawBody}`;
  const computedB = crypto.createHmac("sha256", secret).update(baseB).digest("hex");

  const safeEq = (a: string, b: string) => {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  };

  return safeEq(received, computedA.toLowerCase()) || safeEq(received, computedB.toLowerCase());
}

function mapInternalPaymentStatus(mpStatus: string) {
  const s = String(mpStatus || "").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  if (s === "refunded") return "refunded";
  if (s === "charged_back" || s === "chargeback") return "chargeback";
  if (s === "error") return "error";
  return "pending";
}

async function safeReadText(res: Response) {
  return res.text().catch(() => "");
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    let payload: any = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      console.warn("[MP webhook] invalid json body");
    }

    const paymentId =
      payload?.data?.id ??
      payload?.id ??
      (typeof payload?.resource === "string" ? payload.resource.split("/").pop() : null);

    if (!paymentId) {
      console.warn("[MP webhook] missing paymentId", {
        hasDataId: !!payload?.data?.id,
        hasId: !!payload?.id,
        hasResource: !!payload?.resource,
      });
      return NextResponse.json({ received: true });
    }

    const enforceSig = process.env.MP_WEBHOOK_ENFORCE_SIG === "true";
    const okSig = verifyMpSignature(req, rawBody, String(paymentId));

    console.log("[MP webhook] sig-check", {
      enforce: enforceSig,
      okSig,
      hasSecret: !!process.env.MP_WEBHOOK_SECRET,
      xRequestId: req.headers.get("x-request-id"),
      xSignature: !!req.headers.get("x-signature"),
      paymentId: String(paymentId),
      bodyLen: rawBody.length,
    });

    if (enforceSig && !okSig) {
      console.error("[MP webhook] invalid signature", {
        paymentId: String(paymentId),
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const mpAccessToken = process.env.MP_ACCESS_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!mpAccessToken || !supabaseUrl || !supabaseKey) {
      console.error("[MP webhook] missing env vars", {
        hasMpAccessToken: !!mpAccessToken,
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
      });
      return NextResponse.json({ received: true });
    }

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
        const t = await safeReadText(res);
        throw new Error(`Supabase error ${res.status}: ${t}`);
      }
      return res;
    };

    const rpcJson = async (fn: string, body: any) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const txt = await safeReadText(r);
      if (!r.ok) {
        throw new Error(`RPC ${fn} failed: ${txt}`);
      }

      return txt ? JSON.parse(txt) : null;
    };

    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });

    if (!payRes.ok) {
      const payErr = await safeReadText(payRes);
      console.error("[MP webhook] failed to fetch payment details", {
        paymentId: String(paymentId),
        status: payRes.status,
        body: payErr.slice(0, 500),
      });
      return NextResponse.json({ received: true });
    }

    const payment = await payRes.json();

    const mpStatus = String(payment.status ?? "");
    const orderId = payment.external_reference ? String(payment.external_reference) : null;

    if (!orderId) {
      console.warn("[MP webhook] payment without external_reference", {
        paymentId: String(payment.id ?? paymentId),
        mpStatus,
      });
      return NextResponse.json({ received: true });
    }

    const providerPaymentId = String(payment.id);
    const providerPaymentUpdatedAt =
      payment.date_last_updated || payment.date_approved || payment.date_created || null;

    const orderRes = await sb(
      `orders?select=id,status&id=eq.${encodeURIComponent(orderId)}&limit=1`,
      { method: "GET" }
    );
    const orderRows = (await orderRes.json()) as Array<{ id: string; status?: string }>;
    const orderRow = orderRows?.[0];

    if (!orderRow?.id) {
      console.error("[MP webhook] order not found for external_reference", {
        orderId,
        paymentId: providerPaymentId,
      });
      return NextResponse.json({ received: true });
    }

    const q =
      `payments?select=id,provider_payment_status,provider_payment_updated_at` +
      `&provider=eq.mercadopago` +
      `&provider_payment_id=eq.${encodeURIComponent(providerPaymentId)}` +
      `&limit=1`;

    const existingRes = await sb(q, { method: "GET" });
    const existing = (await existingRes.json()) as any[];
    const existingRow = existing?.[0];

    if (
      existingRow &&
      String(existingRow.provider_payment_status ?? "") === String(mpStatus) &&
      String(existingRow.provider_payment_updated_at ?? "") === String(providerPaymentUpdatedAt ?? "")
    ) {
      console.log("[MP webhook] idempotent event ignored", {
        orderId,
        paymentId: providerPaymentId,
        mpStatus,
      });
      return NextResponse.json({ received: true, idempotent: true });
    }

    const internalStatus = mapInternalPaymentStatus(mpStatus);

    try {
      await sb("payments", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          order_id: orderId,
          provider: "mercadopago",
          status: internalStatus,
          provider_payment_id: providerPaymentId,
          provider_payment_status: mpStatus,
          provider_payment_updated_at: providerPaymentUpdatedAt,
          provider_payload: payment,
          amount_brl: payment.transaction_amount ?? null,
          currency: payment.currency_id ?? "BRL",
        }),
      });
    } catch (insertErr) {
      console.warn("[MP webhook] payments upsert fallback to patch", {
        orderId,
        paymentId: providerPaymentId,
        message: insertErr instanceof Error ? insertErr.message : String(insertErr),
      });

      await sb(
        `payments?provider=eq.mercadopago&provider_payment_id=eq.${encodeURIComponent(providerPaymentId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: internalStatus,
            provider_payment_status: mpStatus,
            provider_payment_updated_at: providerPaymentUpdatedAt,
            provider_payload: payment,
            amount_brl: payment.transaction_amount ?? null,
            currency: payment.currency_id ?? "BRL",
          }),
        }
      );
    }

    if (mpStatus === "approved") {
      console.log("[MP webhook] committing order", {
        orderId,
        paymentId: providerPaymentId,
      });

      await rpcJson("rpc_checkout_commit", {
        p_order_id: orderId,
        p_provider: "mercadopago",
        p_provider_payment_id: providerPaymentId,
        p_amount_brl: payment.transaction_amount,
        p_provider_payload: payment,
      });
    } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
      console.log("[MP webhook] releasing order", {
        orderId,
        paymentId: providerPaymentId,
        mpStatus,
      });

      await rpcJson("rpc_checkout_release", { p_order_id: orderId });

      await sb(`orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
    } else {
      console.log("[MP webhook] setting order awaiting_payment", {
        orderId,
        paymentId: providerPaymentId,
        mpStatus,
      });

      await sb(`orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "awaiting_payment" }),
      });
    }

    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    console.error("[MP webhook] unhandled error", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });

    return NextResponse.json({ received: true, handled: false });
  }
}