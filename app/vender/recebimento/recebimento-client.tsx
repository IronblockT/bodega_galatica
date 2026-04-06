"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/hooks/useAuth";

type Quote = {
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
  cash_buy_price_unit: number | string;
  cash_buy_price_total: number | string;
  store_credit_buy_price_unit: number | string;
  store_credit_buy_price_total: number | string;
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

type CardRow = {
  card_uid: string;
  expansion_code: string;
  title: string;
  subtitle: string | null;
  image_front_url: string | null;
  card_type_label: string | null;
  rarity_label: string | null;
};

type QuoteApiResponse =
  | { ok: true; quote: Quote }
  | { ok: false; error: string; detail?: unknown };

type CreateOfferResponse =
  | {
    ok: true;
    offer: {
      offer_id: string;
      offer_status: string;
      payout_type: "cash" | "store_credit";
      final_amount: number | string;
      cash_reserved_amount: number | string;
      manual_review_required: boolean;
      review_reason: string | null;
      item_id: string;
      item_status: string;
    };
  }
  | {
    ok: false;
    error: string;
    detail?: unknown;
  };

type PayoutOption = {
  key: "store_credit" | "cash";
  title: string;
  value: number;
  description: string;
};

export function RecebimentoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  const sku = String(searchParams.get("sku") ?? "").trim();
  const qty = Math.max(parseInt(String(searchParams.get("qty") ?? "1"), 10) || 1, 1);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<"store_credit" | "cash" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!sku) {
        if (!mounted) return;
        setErrorMsg("Não foi possível identificar a oferta em andamento.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMsg(null);

        const quoteRes = await fetch("/api/buylist/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku_key: sku,
            quantity: qty,
          }),
        });

        const quoteJson = (await quoteRes.json().catch(() => null)) as QuoteApiResponse | null;

        if (!mounted) return;

        if (!quoteRes.ok || !quoteJson?.ok || !quoteJson.quote) {
          setErrorMsg("Não foi possível carregar esta etapa.");
          setLoading(false);
          return;
        }

        const nextQuote = quoteJson.quote;
        setQuote(nextQuote);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const cardUrl =
          `${supabaseUrl}/rest/v1/swu_cards_ui` +
          `?select=card_uid,expansion_code,title,subtitle,image_front_url,card_type_label,rarity_label` +
          `&card_uid=eq.${encodeURIComponent(nextQuote.card_uid)}` +
          `&limit=1`;

        const cardRes = await fetch(cardUrl, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          cache: "no-store",
        });

        if (cardRes.ok) {
          const rows = (await cardRes.json().catch(() => null)) as CardRow[] | null;
          setCard(rows?.[0] ?? null);
        } else {
          setCard(null);
        }

        if (nextQuote.is_buylist_available) {
          if (nextQuote.allowed_payout_type === "store_credit") {
            setSelectedPayout("store_credit");
          } else if (nextQuote.store_credit_allowed) {
            setSelectedPayout("store_credit");
          } else if (nextQuote.cash_allowed) {
            setSelectedPayout("cash");
          } else {
            setSelectedPayout(null);
          }
        } else {
          setSelectedPayout(null);
        }

        setLoading(false);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(err?.message ?? "Erro ao carregar esta etapa.");
        setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [sku, qty]);

  const displayName = useMemo(() => {
    if (!quote) return "";
    if (!card) return quote.card_uid;
    return card.subtitle ? `${card.title}, ${card.subtitle}` : card.title;
  }, [card, quote]);

  const payoutOptions = useMemo<PayoutOption[]>(() => {
    if (!quote || !quote.is_buylist_available) return [];

    if (quote.allowed_payout_type === "store_credit") {
      return [
        {
          key: "store_credit",
          title: "Crédito na loja",
          value: Number(quote.store_credit_buy_price_total || 0),
          description:
            "No momento, esta oferta pode seguir apenas com recebimento em crédito na Bodega Galática.",
        },
      ];
    }

    const options: PayoutOption[] = [];

    if (quote.store_credit_allowed) {
      options.push({
        key: "store_credit",
        title: "Crédito na loja",
        value: Number(quote.store_credit_buy_price_total || 0),
        description:
          "Receba esse valor como crédito para usar em compras dentro da Bodega Galática.",
      });
    }

    if (quote.cash_allowed) {
      options.push({
        key: "cash",
        title: "Dinheiro",
        value: Number(quote.cash_buy_price_total || 0),
        description:
          "Receba esse valor em dinheiro, conforme as regras atuais da buylist.",
      });
    }

    return options;
  }, [quote]);

  async function handleContinue() {
    if (!quote || !selectedPayout) return;

    if (!isLoggedIn) {
      const qs = searchParams.toString();
      const next = qs ? `${pathname}?${qs}` : pathname;
      router.push(`/entrar?next=${encodeURIComponent(next)}`);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMsg("Você precisa estar logado para continuar.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/buylist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          sku_key: sku,
          quantity: qty,
          payout_type: selectedPayout,
        }),
      });

      const json = (await res.json().catch(() => null)) as CreateOfferResponse | null;

      if (!res.ok || !json?.ok || !json.offer) {
        setErrorMsg(
          json && "error" in json ? json.error : "Falha ao criar sua oferta."
        );
        setSubmitting(false);
        return;
      }

      router.push(
        `/vender/sucesso?offer_id=${encodeURIComponent(
          json.offer.offer_id
        )}&payout_type=${encodeURIComponent(json.offer.payout_type)}`
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao criar sua oferta.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-8 text-white shadow-2xl">
        Carregando etapa de recebimento...
      </div>
    );
  }

  if (errorMsg || !sku || !quote) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-8 text-white shadow-2xl">
        <h1 className="text-2xl font-semibold">Não foi possível carregar esta etapa</h1>
        <p className="mt-3 text-white/70">
          {errorMsg ?? "Tente reiniciar o fluxo a partir da página de venda."}
        </p>
        <Link
          href="/vender"
          className="mt-6 inline-flex rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-[#0B0C10]"
        >
          Voltar para vender
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-black md:text-5xl">
          Forma de recebimento
        </h1>
        <p className="mt-4 text-lg text-black/65">
          Escolha a forma de recebimento da sua oferta e confira quanto você recebe em cada opção disponível.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
        <div className="sunset-line" />

        <div className="grid gap-8 p-6 md:grid-cols-[220px_1fr] md:p-8">
          <div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {card?.image_front_url ? (
                <img
                  src={card.image_front_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex min-h-[300px] items-center justify-center text-sm text-white/50">
                  Sem imagem
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
              Recebimento da oferta
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {displayName}
            </h2>

            <p className="mt-2 text-sm text-white/60">
              {card?.card_type_label ?? "—"} • {card?.expansion_code ?? "—"} •{" "}
              {quote.finish} • {quote.promo_type}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">
                  Quantidade
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {quote.quantity}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">
                  Valor base da oferta
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  R$ {Number(quote.buy_price_total || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {quote.manual_review_required ? (
              <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                Esta oferta pode passar por uma revisão manual antes da confirmação final.
              </div>
            ) : null}

            {!quote.is_buylist_available ? (
              <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                No momento esta oferta não pode seguir. Você pode voltar e consultar novamente mais tarde.
              </div>
            ) : null}

            {quote.is_buylist_available ? (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                Sua oferta pode seguir normalmente. Escolha abaixo a forma de recebimento que preferir.
              </div>
            ) : null}

            {quote.is_buylist_available ? (
              <div className="mt-6 space-y-3">
                {payoutOptions.map((option) => {
                  const selected = selectedPayout === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedPayout(option.key)}
                      className={[
                        "w-full rounded-2xl border p-4 text-left transition",
                        selected
                          ? "border-orange-400 bg-orange-400/10"
                          : "border-white/10 bg-black/40 hover:bg-white/5",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-base font-semibold text-white">
                            {option.title}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/65">
                            {option.description}
                          </p>
                        </div>

                        <div
                          className={[
                            "rounded-xl px-4 py-3 text-right",
                            selected
                              ? "border border-orange-300/20 bg-orange-300/10"
                              : "border border-white/10 bg-black/50",
                          ].join(" ")}
                        >
                          <div className="text-xs uppercase tracking-wide text-white/45">
                            Você recebe
                          </div>
                          <div className="mt-1 text-lg font-semibold text-white">
                            R$ {option.value.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {errorMsg ? (
              <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                {errorMsg}
              </div>
            ) : null}

            <p className="mt-6 text-sm leading-6 text-white/60">
              Depois da confirmação, sua oferta será registrada com a forma de recebimento escolhida.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/vender/revisao?sku=${encodeURIComponent(sku)}&qty=${encodeURIComponent(String(qty))}`}
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                Voltar
              </Link>

              <button
                type="button"
                disabled={!quote.is_buylist_available || !selectedPayout || submitting}
                onClick={handleContinue}
                className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-center text-sm font-semibold text-[#0B0C10] transition-colors hover:from-orange-500 hover:to-orange-600 disabled:opacity-40"
              >
                {submitting ? "Criando oferta..." : "Confirmar e continuar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}