"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SellCartItem,
  SellPayoutType,
  useSellCart,
} from "@/components/sell-cart/SellCartProvider";

function formatMoneyBRL(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(n)) {
    return "—";
  }

  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getItemName(item: SellCartItem) {
  const card = item.card_snapshot;

  if (!card) return item.quote_snapshot.card_uid || item.sku_key;

  return card.subtitle ? `${card.title}, ${card.subtitle}` : card.title;
}

function getItemUnitValue(item: SellCartItem) {
  if (item.payout_type === "store_credit") {
    return Number(item.quote_snapshot.store_credit_buy_price_unit ?? 0);
  }

  return Number(item.quote_snapshot.cash_buy_price_unit ?? 0);
}

function getItemTotalValue(item: SellCartItem) {
  if (item.payout_type === "store_credit") {
    return Number(item.quote_snapshot.store_credit_buy_price_total ?? 0);
  }

  return Number(item.quote_snapshot.cash_buy_price_total ?? 0);
}

function payoutLabel(payoutType: SellPayoutType) {
  if (payoutType === "store_credit") return "Crédito na loja";
  return "Dinheiro / Pix";
}

function SellCartSection({
  title,
  description,
  payoutType,
  items,
}: {
  title: string;
  description: string;
  payoutType: SellPayoutType;
  items: SellCartItem[];
}) {
  const sellCart = useSellCart();

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + getItemTotalValue(item), 0);
  }, [items]);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
      <div className="sunset-line" />

      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
              {title}
            </div>

            <p className="mt-3 text-sm leading-6 text-white/65">
              {description}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-wide text-white/45">
              Subtotal
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {formatMoneyBRL(subtotal)}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/55">
            Nenhuma carta adicionada nesta lista.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {items.map((item) => {
              const q = item.quote_snapshot;
              const unitValue = getItemUnitValue(item);
              const totalValue = getItemTotalValue(item);

              return (
                <div
                  key={`${item.payout_type}:${item.sku_key}`}
                  className="rounded-xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {getItemName(item)}
                      </div>

                      <div className="mt-1 text-xs text-white/55">
                        {item.card_snapshot?.card_type_label ?? "—"} •{" "}
                        {item.card_snapshot?.expansion_code ?? "—"} •{" "}
                        {q.finish} • {q.promo_type} • {q.condition}
                      </div>                      

                      {q.manual_review_required ? (
                        <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                          Esta carta pode exigir revisão manual.
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[300px]">
                      <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                        <div className="text-xs text-white/45">Quantidade</div>
                        <div className="mt-1 font-semibold text-white">
                          {item.quantity}
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                        <div className="text-xs text-white/45">Unidade</div>
                        <div className="mt-1 font-semibold text-white">
                          {formatMoneyBRL(unitValue)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                        <div className="text-xs text-white/45">Total</div>
                        <div className="mt-1 font-semibold text-orange-300">
                          {formatMoneyBRL(totalValue)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          sellCart.removeItem(payoutType, item.sku_key)
                        }
                        className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function VenderCarrinhoPage() {
  const router = useRouter();
  const sellCart = useSellCart();

  const hasItems = sellCart.totalCount > 0;

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-black md:text-5xl">
            Carrinho de venda
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-black/65">
            Revise as cartas que você quer vender para a Bodega Galática. As listas
            ficam separadas por forma de recebimento.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-5 text-white shadow-2xl">
            <div className="text-xs uppercase tracking-wide text-white/45">
              Itens em dinheiro/Pix
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {sellCart.cashCount}
            </div>
            <div className="mt-2 text-sm text-white/65">
              {formatMoneyBRL(sellCart.cashTotal)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-5 text-white shadow-2xl">
            <div className="text-xs uppercase tracking-wide text-white/45">
              Itens em crédito
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {sellCart.storeCreditCount}
            </div>
            <div className="mt-2 text-sm text-white/65">
              {formatMoneyBRL(sellCart.storeCreditTotal)}
            </div>
          </div>

          <div className="rounded-2xl border border-orange-400/20 bg-[#0B0C10]/95 p-5 text-white shadow-2xl">
            <div className="text-xs uppercase tracking-wide text-orange-300/70">
              Total estimado
            </div>
            <div className="mt-1 text-2xl font-semibold text-orange-300">
              {formatMoneyBRL(sellCart.grandTotal)}
            </div>
            <div className="mt-2 text-sm text-white/55">
              Sujeito à conferência física das cartas.
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SellCartSection
            title="Lista Dinheiro / Pix"
            description="Cartas que serão enviadas para recebimento em dinheiro via Pix após conferência."
            payoutType="cash"
            items={sellCart.cashItems}
          />

          <SellCartSection
            title="Lista Crédito na loja"
            description="Cartas que serão convertidas em crédito para usar em compras na Bodega Galática após conferência."
            payoutType="store_credit"
            items={sellCart.storeCreditItems}
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/vender"
            className="rounded-full border border-black/15 bg-white px-6 py-3 text-center text-sm font-semibold text-black/80 shadow-sm transition hover:bg-black hover:text-white"
          >
            Continuar vendendo
          </Link>

          <button
            type="button"
            disabled={!hasItems}
            onClick={() => sellCart.clear()}
            className="rounded-full border border-rose-200 bg-rose-50 px-6 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-600 hover:bg-rose-600 hover:text-white disabled:opacity-40"
          >
            Limpar carrinho
          </button>

          <button
            type="button"
            disabled={!hasItems}
            onClick={() => router.push("/vender/checkout")}
            className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-[#0B0C10] transition hover:bg-orange-600 disabled:opacity-40"
          >
            Finalizar venda
          </button>
        </div>
      </div>
    </main>
  );
}