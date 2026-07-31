"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/hooks/useAuth";

const panelClass =
  "rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl";

export default function CheckoutSuccessPage() {
  const { clearLocal, orderId: cartOrderId } = useCart();
  const { session } = useAuth();

  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<
    "checking" | "paid" | "pending" | "error"
  >("checking");

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;

    const params = new URLSearchParams(window.location.search);
    const order = params.get("order");

    setOrderId(order);

    if (!order || !session?.access_token) {
      return;
    }

    didInit.current = true;

    let cancelled = false;

    const checkStatus = async () => {
      try {
        // O webhook pode chegar alguns segundos depois do redirect.
        // Tentamos algumas vezes antes de considerar ainda pendente.
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const res = await fetch(
            `/api/checkout/status?order_id=${encodeURIComponent(order)}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              cache: "no-store",
            }
          );

          if (!res.ok) {
            if (res.status === 401 || res.status === 404) {
              if (!cancelled) {
                setPaymentState("error");
              }
              return;
            }

            throw new Error(`Falha ao consultar pedido: HTTP ${res.status}`);
          }

          const json = (await res.json()) as {
            status?: string;
            paid?: boolean;
          };

          if (cancelled) return;

          if (json.paid || json.status === "paid") {
            setPaymentState("paid");

            // Só limpa este carrinho se ele ainda estiver vinculado
            // ao pedido que acabou de ser confirmado.
            if (cartOrderId === order) {
              clearLocal();
            }

            return;
          }

          if (attempt < 5) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        if (!cancelled) {
          setPaymentState("pending");
        }
      } catch (err) {
        console.error("[checkout/success] status check failed", err);

        if (!cancelled) {
          setPaymentState("error");
        }
      }
    };

    void checkStatus();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, cartOrderId, clearLocal]);

  const title = useMemo(() => {
    switch (paymentState) {
      case "paid":
        return "Pagamento aprovado";
      case "checking":
        return "Confirmando pagamento";
      case "pending":
        return "Pagamento em confirmação";
      case "error":
        return "Não foi possível confirmar o pagamento";
    }
  }, [paymentState]);

  const message = useMemo(() => {
    switch (paymentState) {
      case "paid":
        return "Seu pagamento foi confirmado. Seu pedido já está em processamento.";

      case "checking":
        return "Estamos verificando a confirmação do pagamento. Isso pode levar alguns segundos.";

      case "pending":
        return "Ainda não recebemos a confirmação final do pagamento. Você pode acompanhar o status do pedido pela sua conta.";

      case "error":
        return "Não conseguimos consultar o status do pedido neste momento. Verifique o pedido em Minha Conta antes de tentar pagar novamente.";
    }
  }, [paymentState]);

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(34,197,94,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <div className={panelClass}>
          <div className="p-8">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
              {paymentState === "paid" ? "✓" : paymentState === "checking" ? "…" : "!"}
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              {title}
            </h1>

            <p className="mt-4 text-white/65">{message}</p>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/75">
              <span className="text-white/50">Pedido:</span>{" "}
              <span className="font-mono">{orderId ?? "—"}</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {paymentState === "paid" ? (
                <>
                  <Link
                    href="/cartas"
                    className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors"
                  >
                    Continuar comprando
                  </Link>

                  <Link
                    href="/minha-conta"
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors"
                  >
                    Minha conta
                  </Link>
                </>
              ) : paymentState === "checking" ? (
                <Link
                  href="/minha-conta"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors"
                >
                  Minha conta
                </Link>
              ) : (
                <>
                  <Link
                    href="/minha-conta"
                    className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors"
                  >
                    Ver meu pedido
                  </Link>

                  <Link
                    href="/carrinho"
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors"
                  >
                    Voltar ao carrinho
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}