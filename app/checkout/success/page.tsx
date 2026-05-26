"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

const panelClass =
  "rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl";

function isMercadoPagoApproved(params: URLSearchParams) {
  const status = String(params.get("status") ?? "").toLowerCase();
  const collectionStatus = String(params.get("collection_status") ?? "").toLowerCase();
  const paymentStatus = String(params.get("payment_status") ?? "").toLowerCase();

  return (
    status === "approved" ||
    collectionStatus === "approved" ||
    paymentStatus === "approved"
  );
}

export default function CheckoutSuccessPage() {
  const { clear } = useCart();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [approvedByReturnUrl, setApprovedByReturnUrl] = useState(false);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const params = new URLSearchParams(window.location.search);
    const order = params.get("order");

    setOrderId(order);

    const approved = isMercadoPagoApproved(params);
    setApprovedByReturnUrl(approved);

    if (approved) {
      clear();
    }
  }, [clear]);

  const title = useMemo(() => {
    return approvedByReturnUrl
      ? "Pagamento aprovado"
      : "Retorno do pagamento";
  }, [approvedByReturnUrl]);

  const message = useMemo(() => {
    return approvedByReturnUrl
      ? "Seu pagamento foi recebido com sucesso. Seu pedido já está em processamento."
      : "Voltamos do ambiente de pagamento, mas ainda não recebemos confirmação de aprovação. Se você não concluiu o pagamento, seus itens devem continuar no carrinho.";
  }, [approvedByReturnUrl]);

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(34,197,94,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <div className={panelClass}>
          <div className="p-8">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
              {approvedByReturnUrl ? "✓" : "!"}
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
              {approvedByReturnUrl ? (
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
              ) : (
                <>
                  <Link
                    href="/checkout"
                    className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors"
                  >
                    Tentar pagar novamente
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