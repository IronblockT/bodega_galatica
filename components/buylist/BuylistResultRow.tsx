"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConditionSelector } from "@/components/cards/ConditionSelector";
import { QuantitySelector } from "@/components/cards/QuantitySelector";

function getTypeLabel(v: any): string {
  if (!v) return "—";
  if (typeof v === "string") return v;

  const name1 = v?.data?.attributes?.name;
  if (typeof name1 === "string" && name1.trim()) return name1.trim();

  const name2 = v?.attributes?.name;
  if (typeof name2 === "string" && name2.trim()) return name2.trim();

  const name3 = v?.name;
  if (typeof name3 === "string" && name3.trim()) return name3.trim();

  return "—";
}

type BuylistQuote = {
  sku_key: string;
  card_uid: string;
  finish: string;
  promo_type: string;
  condition: string;
  quantity: number;
  sell_price: number | string;
  pricing_rule_id: string | null;
  rule_name: string | null;
  calculation_type: string | null;
  base_buy_price_unit: number | string;
  stock_reduction_percent: number | string;
  adjusted_buy_price_unit: number | string;
  rounded_buy_price_unit: number | string;
  buy_price_total: number | string;
  max_qty_per_sku: number;
  stock_on_hand: number;
  stock_reserved: number;
  is_paused_by_stock: boolean;
  exceeds_qty_limit: boolean;
  manual_review_required: boolean;
  review_reason: string | null;
  cash_available: number | string;
  buy_budget_left_total: number | string;
  cash_allowed: boolean;
  store_credit_allowed: boolean;
  allowed_payout_type: string | null;
  is_buylist_available: boolean;
  unavailable_reason: string | null;
};

type QuoteResponse =
  | {
    ok: true;
    quote: BuylistQuote;
  }
  | {
    ok: false;
    error: string;
    detail?: unknown;
  };

export function BuylistResultRow({ card }: any) {
  const router = useRouter();

  const [condition, setCondition] = useState(card.recommendedCondition ?? "NM");
  const [qty, setQty] = useState(1);

  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quote, setQuote] = useState<BuylistQuote | null>(null);

  const variant =
    card.variants?.[condition] ?? {
      price: 0,
      stock: 0,
      promo_type: "—",
      sku_key: null,
    };

  const promoTypeLabel = variant?.promo_type ?? "—";
  const typeLabel = getTypeLabel(card.type);
  const isHorizontal = card.type === "Leader" || card.type === "Base";

  const detailHref = useMemo(() => {
    const uid = encodeURIComponent(String(card.uid ?? ""));
    const finish = encodeURIComponent(String(card.finish ?? "standard"));
    const cond = encodeURIComponent(String(condition ?? "NM"));
    return `/cartas/${uid}?finish=${finish}&cond=${cond}`;
  }, [card.uid, card.finish, condition]);

  const quantityMax = useMemo(() => {
    if (quote?.max_qty_per_sku && quote.max_qty_per_sku > 0) {
      return quote.max_qty_per_sku;
    }
    return 8;
  }, [quote?.max_qty_per_sku]);

  useEffect(() => {
    if (quantityMax <= 0) {
      setQty(0);
      return;
    }

    setQty((prev) => {
      if (prev < 1) return 1;
      if (prev > quantityMax) return quantityMax;
      return prev;
    });
  }, [quantityMax]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!variant?.sku_key || qty <= 0) {
        if (!mounted) return;
        setQuote(null);
        setQuoteError(null);
        return;
      }

      try {
        setLoadingQuote(true);
        setQuoteError(null);

        const res = await fetch("/api/buylist/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku_key: variant.sku_key,
            quantity: qty,
          }),
        });

        const json = (await res.json().catch(() => null)) as QuoteResponse | null;

        if (!mounted) return;

        if (!res.ok || !json?.ok) {
          setQuote(null);
          setQuoteError(
            json && "error" in json ? json.error : "Falha ao calcular cotação."
          );
          setLoadingQuote(false);
          return;
        }

        setQuote(json.quote);
        setLoadingQuote(false);
      } catch (err: any) {
        if (!mounted) return;
        setQuote(null);
        setQuoteError(err?.message ?? "Falha ao calcular cotação.");
        setLoadingQuote(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [variant?.sku_key, qty]);

  useEffect(() => {
    if (!quote?.max_qty_per_sku) return;

    setQty((prev) => {
      if (prev < 1) return 1;
      if (prev > quote.max_qty_per_sku) return quote.max_qty_per_sku;
      return prev;
    });
  }, [quote?.max_qty_per_sku]);

  const statusBadge = useMemo(() => {
    if (!quote) return null;

    if (!quote.is_buylist_available) {
      return (
        <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-200">
          Indisponível no momento
        </span>
      );
    }

    if (quote.allowed_payout_type === "store_credit") {
      return (
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
          Somente crédito na loja
        </span>
      );
    }

    return (
      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
        Disponível
      </span>
    );
  }, [quote]);

  const disabledAction =
    loadingQuote ||
    !quote ||
    !quote.is_buylist_available ||
    qty <= 0 ||
    !variant?.sku_key;

  function handleSellRequest() {
    if (!quote || !variant?.sku_key) return;

    const params = new URLSearchParams({
      sku: variant.sku_key,
      qty: String(qty),
    });

    router.push(`/vender/revisao?${params.toString()}`);
  }

  return (
    <div className="flex gap-4 rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur">
      <div className="flex-shrink-0">
        <Link href={detailHref} className="block">
          <div className="relative flex h-48 w-36 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 md:h-56 md:w-40">
            {card.image ? (
              <img
                src={card.image}
                alt={card.name}
                className={[
                  "max-h-full max-w-full",
                  isHorizontal ? "object-contain p-2" : "object-cover",
                ].join(" ")}
                loading="lazy"
              />
            ) : null}
          </div>
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="font-semibold text-white">
            <Link href={detailHref} className="hover:underline">
              {card.name}
            </Link>
          </h3>

          <p className="text-xs text-white/60">
            {typeLabel} • {card.set} • {card.finish} • {promoTypeLabel}
          </p>

          {card.rules_text ? (
            <p className="mt-2 line-clamp-2 text-sm text-white/70">
              {card.rules_text}
            </p>
          ) : null}
        </div>

        <ConditionSelector
          variants={card.variants}
          value={condition}
          onChange={setCondition}
        />
      </div>

      <div className="w-64 text-right">
        <div className="text-xs uppercase tracking-wide text-white/45">
          Valor de recompra
        </div>

        <div className="mt-1 text-2xl font-semibold text-white">
          {loadingQuote
            ? "..."
            : quote
              ? `R$ ${Number(quote.buy_price_total || 0).toFixed(2)}`
              : "—"}
        </div>

        <div className="mt-2 flex justify-end">{statusBadge}</div>

        {quote ? (
          <p className="mt-2 text-xs text-white/60">
            {!quote.is_buylist_available
              ? "No momento não estamos comprando esta carta."
              : quote.allowed_payout_type === "store_credit"
                ? "No momento esta oferta segue apenas com crédito na loja."
                : "Você pode seguir com esta oferta."}
          </p>
        ) : null}

        {quote ? (
          <p className="mt-2 text-xs text-white/60">
            {quote.max_qty_per_sku > 0
              ? `Limite disponível desta carta: até ${quote.max_qty_per_sku} unidade${quote.max_qty_per_sku === 1 ? "" : "s"}`
              : "Não há mais disponibilidade desta carta para recompra neste momento."}
          </p>
        ) : (
          <p className="mt-2 text-xs text-white/60">
            Calculando disponibilidade...
          </p>
        )}

        <QuantitySelector max={quantityMax} value={qty} onChange={setQty} />

        {quote?.manual_review_required ? (
          <p className="mt-2 text-xs text-amber-200">
            Esta carta pode exigir revisão manual.
          </p>
        ) : null}

        {quoteError ? (
          <p className="mt-2 text-xs text-rose-200">{quoteError}</p>
        ) : null}

        <button
          type="button"
          disabled={disabledAction}
          className={[
            "mt-3 w-full rounded-full px-4 py-2 text-xs font-semibold transition-colors",
            "text-[#0B0C10]",
            "bg-gradient-to-r from-orange-400 to-orange-500",
            "hover:from-orange-500 hover:to-orange-600",
            "disabled:opacity-40",
          ].join(" ")}
          onClick={handleSellRequest}
        >
          Vender para a loja
        </button>
      </div>
    </div>
  );
}