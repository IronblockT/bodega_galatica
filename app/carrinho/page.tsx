// app/carrinho/page.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

const panelClass = "rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl";
const btnPrimary =
  "rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors disabled:opacity-40";

export default function CarrinhoPage() {
  const { items, count, reserving, lastReserveError, orderId, expiresAt, reserveNow, clear } = useCart();

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">Carrinho</h1>
          <p className="mt-4 text-black/65">
            {count ? `${count} item(ns) no carrinho` : "Seu carrinho está vazio."}
          </p>
        </div>

        <div className={panelClass}>
          <div className="p-6">
            {/* status */}
            <div className="mb-4 text-xs text-white/60">
              <div>orderId: <span className="text-white/80">{orderId ?? "—"}</span></div>
              <div>expiresAt: <span className="text-white/80">{expiresAt ?? "—"}</span></div>
            </div>

            {lastReserveError ? (
              <div className="mb-4 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-rose-200">
                {lastReserveError}
              </div>
            ) : null}

            {/* lista (por enquanto só SKU + qty) */}
            {items.length === 0 ? (
              <div className="text-sm text-white/60">
                Voltar para <Link href="/cartas" className="text-orange-300 hover:underline">Buscar Cartas</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => (
                  <div
                    key={it.sku_key}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 px-4 py-3"
                  >
                    <div className="text-sm text-white/80">
                      <div className="text-xs text-white/50">SKU</div>
                      <div className="font-mono text-xs">{it.sku_key}</div>
                    </div>

                    <div className="text-sm text-white/80">
                      <div className="text-xs text-white/50">Qtd</div>
                      <div className="text-right">{it.qty}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ações */}
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              <button className={btnPrimary} disabled={items.length === 0 || reserving} onClick={reserveNow}>
                {reserving ? "Reservando..." : "Reservar agora"}
              </button>

              <button
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40"
                disabled={items.length === 0}
                onClick={clear}
              >
                Limpar carrinho
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}