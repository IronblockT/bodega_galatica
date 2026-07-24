"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const panelClass =
  "rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl";

type PendingState = "waiting" | "checking" | "confirmed" | "error";

export default function CheckoutPendingPage() {
  const router = useRouter();

  const [orderId, setOrderId] = useState<string | null>(null);
  const [state, setState] = useState<PendingState>("waiting");
  const [message, setMessage] = useState(
    "Seu pagamento está em análise ou aguardando confirmação.",
  );

  const checkingRef = useRef(false);
  const finishedRef = useRef(false);

  const checkOrderStatus = useCallback(
    async (targetOrderId: string) => {
      if (checkingRef.current || finishedRef.current) return;

      checkingRef.current = true;
      setState((current) => (current === "waiting" ? "checking" : current));

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(userError.message);
        }

        if (!user) {
          throw new Error(
            "Sua sessão expirou. Entre novamente para consultar o pedido.",
          );
        }

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("id, status, updated_at")
          .eq("id", targetOrderId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (orderError) {
          throw new Error(orderError.message);
        }

        if (!order) {
          throw new Error(
            "Pedido não encontrado ou não pertence ao usuário conectado.",
          );
        }

        const orderStatus = String(order.status ?? "").toLowerCase();

        if (orderStatus === "paid") {
          finishedRef.current = true;
          setState("confirmed");
          setMessage("Pagamento confirmado! Redirecionando...");

          router.replace(
            `/checkout/success?order=${encodeURIComponent(
              targetOrderId,
            )}&status=approved`,
          );
          return;
        }

        if (orderStatus === "cancelled") {
          finishedRef.current = true;

          router.replace(
            `/checkout/failure?order=${encodeURIComponent(
              targetOrderId,
            )}&status=rejected`,
          );
          return;
        }

        setState("waiting");
        setMessage(
          "Pagamento recebido. Estamos aguardando a confirmação automática do pedido.",
        );
      } catch (error) {
        console.error("[checkout/pending] status check failed", error);

        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível consultar o pedido agora. Tentaremos novamente.",
        );
      } finally {
        checkingRef.current = false;
      }
    },
    [router],
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

    void checkOrderStatus(targetOrderId);

    const intervalId = window.setInterval(() => {
      void checkOrderStatus(targetOrderId);
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkOrderStatus(targetOrderId);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [checkOrderStatus]);

  const isConfirmed = state === "confirmed";
  const hasError = state === "error";

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(245,158,11,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <div className={panelClass}>
          <div className="p-8">
            <div
              className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                isConfirmed
                  ? "bg-emerald-500/20"
                  : hasError
                    ? "bg-rose-500/20"
                    : "bg-amber-500/20"
              }`}
            >
              {isConfirmed ? "✓" : hasError ? "!" : "⏳"}
            </div>

            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              {isConfirmed
                ? "Pagamento confirmado"
                : "Confirmando pagamento"}
            </h1>

            <p className="mt-4 text-white/65">{message}</p>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/75">
              <span className="text-white/50">Pedido:</span>{" "}
              <span className="font-mono">{orderId ?? "—"}</span>
            </div>

            {orderId && !isConfirmed ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Verificação automática a cada 3 segundos
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              {orderId && !isConfirmed ? (
                <button
                  type="button"
                  onClick={() => void checkOrderStatus(orderId)}
                  disabled={checkingRef.current}
                  className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-[#0B0C10] transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Verificar agora
                </button>
              ) : null}

              <Link
                href="/cartas"
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
              >
                Voltar à loja
              </Link>

              <Link
                href="/minha-conta"
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
              >
                Minha conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}