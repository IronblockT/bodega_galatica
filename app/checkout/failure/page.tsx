"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/hooks/useAuth";
import { useCart } from "@/components/cart/CartProvider";

const panelClass =
  "rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl";

type FailureState = "checking" | "failed" | "error";

export default function CheckoutFailurePage() {
  const router = useRouter();
  const { session } = useAuth();

  const {
    orderId: cartOrderId,
    detachOrderLocal,
  } = useCart();

  const [orderId, setOrderId] = useState<string | null>(null);
  const [state, setState] = useState<FailureState>("checking");
  const [message, setMessage] = useState(
    "Estamos verificando o status real do pedido."
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetOrderId = String(params.get("order") ?? "").trim();

    setOrderId(targetOrderId || null);

    if (!targetOrderId) {
      setState("error");
      setMessage("O identificador do pedido não foi encontrado.");
      return;
    }

    if (!session?.access_token) {
      setState("checking");
      setMessage("Aguardando sua sessão para consultar o pedido.");
      return;
    }

    let cancelled = false;

    const checkOrderStatus = async () => {
      try {
        const res = await fetch(
          `/api/checkout/status?order_id=${encodeURIComponent(targetOrderId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

        const json = (await res.json().catch(() => null)) as {
          status?: string;
          paid?: boolean;
          error?: string;
        } | null;

        if (!res.ok) {
          throw new Error(
            json?.error ?? `Falha ao consultar pedido: HTTP ${res.status}`
          );
        }

        if (cancelled) return;

        const orderStatus = String(json?.status ?? "").toLowerCase();

        if (json?.paid || orderStatus === "paid") {
          router.replace(
            `/checkout/success?order=${encodeURIComponent(targetOrderId)}`
          );
          return;
        }

        if (
          orderStatus === "awaiting_payment" ||
          orderStatus === "reserved"
        ) {
          router.replace(
            `/checkout/pending?order=${encodeURIComponent(targetOrderId)}`
          );
          return;
        }

        if (
          orderStatus === "cancelled" ||
          orderStatus === "draft"
        ) {
          setState("failed");
          setMessage(
            "O pagamento não foi concluído. Seus itens foram mantidos para que você possa revisar o carrinho e tentar novamente."
          );
          return;
        }

        setState("error");
        setMessage(
          "Não foi possível determinar o estado atual do pedido. Consulte Minha Conta antes de tentar um novo pagamento."
        );
      } catch (error) {
        console.error("[checkout/failure] status check failed", error);

        if (!cancelled) {
          setState("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível consultar o pedido agora."
          );
        }
      }
    };

    void checkOrderStatus();

    return () => {
      cancelled = true;
    };
  }, [router, session?.access_token]);

  useEffect(() => {
    if (
      state === "failed" &&
      orderId &&
      cartOrderId === orderId
    ) {
      detachOrderLocal();
    }
  }, [
    state,
    orderId,
    cartOrderId,
    detachOrderLocal,
  ]);

  const isChecking = state === "checking";
  const hasFailed = state === "failed";

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(239,68,68,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <div className={panelClass}>
          <div className="p-8">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-2xl">
              {isChecking ? "…" : "!"}
            </div>

            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              {isChecking
                ? "Verificando pagamento"
                : hasFailed
                  ? "Pagamento não concluído"
                  : "Não foi possível confirmar o pagamento"}
            </h1>

            <p className="mt-4 text-white/65">
              {message}
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/75">
              <span className="text-white/50">Pedido:</span>{" "}
              <span className="font-mono">
                {orderId ?? "—"}
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {hasFailed ? (
                <>
                  <Link
                    href="/checkout"
                    className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-[#0B0C10] transition-colors hover:bg-orange-600"
                  >
                    Tentar novamente
                  </Link>

                  <Link
                    href="/carrinho"
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
                  >
                    Voltar ao carrinho
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/minha-conta"
                    className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-[#0B0C10] transition-colors hover:bg-orange-600"
                  >
                    Minha conta
                  </Link>

                  {!isChecking ? (
                    <Link
                      href="/carrinho"
                      className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
                    >
                      Voltar ao carrinho
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}