"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/hooks/useAuth";
import {
  SellCartItem,
  useSellCart,
} from "@/components/sell-cart/SellCartProvider";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  pix_key: string | null;
};

type CreateBatchResponse =
  | {
    ok: true;
    checkout_group_id: string;
    offers: Array<{
      ok: true;
      offer_id: string;
      checkout_group_id: string;
      payout_type: "cash" | "store_credit";
      offer_status: string;
      final_amount: number | string;
      cash_reserved_amount: number | string;
      manual_review_required: boolean;
      review_reason: string | null;
      item_count: number;
      items: Array<{
        item_id: string;
        sku_key: string;
        quantity: number;
        buy_price_total: number | string;
      }>;
    }>;
  }
  | {
    ok: false;
    error: string;
    code?: string;
    detail?: string;
    redirect_to?: string;
    missing_fields?: string[];
  };

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

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function hasText(value: string | null | undefined) {
  return String(value ?? "").trim().length > 0;
}

function getDisplayName(item: SellCartItem) {
  const card = item.card_snapshot;

  if (!card) return item.quote_snapshot.card_uid || item.sku_key;

  return card.subtitle ? `${card.title}, ${card.subtitle}` : card.title;
}

function getItemTotal(item: SellCartItem) {
  if (item.payout_type === "store_credit") {
    return Number(item.quote_snapshot.store_credit_buy_price_total ?? 0);
  }

  return Number(item.quote_snapshot.cash_buy_price_total ?? 0);
}

function CheckoutList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: SellCartItem[];
}) {
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + getItemTotal(item), 0);
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
            Nenhum item nesta lista.
          </div>
        ) : (
          <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {items.map((item) => {
              const q = item.quote_snapshot;

              return (
                <div
                  key={`${item.payout_type}:${item.sku_key}`}
                  className="p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {getDisplayName(item)}
                      </div>

                      <div className="mt-1 text-xs text-white/55">
                        {item.card_snapshot?.card_type_label ?? "—"} •{" "}
                        {item.card_snapshot?.expansion_code ?? "—"} •{" "}
                        {q.finish} • {q.promo_type} • {q.condition}
                      </div>

                      {q.manual_review_required ? (
                        <div className="mt-2 text-xs text-amber-200">
                          Pode exigir revisão manual.
                        </div>
                      ) : null}
                    </div>

                    <div className="text-left md:text-right">
                      <div className="text-xs text-white/45">
                        {item.quantity} unidade{item.quantity === 1 ? "" : "s"}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-orange-300">
                        {formatMoneyBRL(getItemTotal(item))}
                      </div>
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

export default function VenderCheckoutPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const sellCart = useSellCart();

  const [checkingProfile, setCheckingProfile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasCashItems = sellCart.cashItems.length > 0;
  const hasStoreCreditItems = sellCart.storeCreditItems.length > 0;
  const hasItems = sellCart.totalCount > 0;

  async function validateProfile() {
    if (!user?.id) {
      return {
        ok: false,
        error: "Você precisa estar logado para finalizar a venda.",
        redirectTo: "/entrar?next=/vender/checkout",
      };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, cpf, pix_key")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: `Erro ao validar cadastro: ${error.message}`,
        redirectTo: null,
      };
    }

    const profile = data as ProfileRow | null;

    const missingFields: string[] = [];

    if (!hasText(profile?.full_name)) missingFields.push("Nome completo");
    if (!hasText(profile?.phone)) missingFields.push("Telefone");
    if (!onlyDigits(profile?.cpf)) missingFields.push("CPF");

    if (onlyDigits(profile?.cpf) && onlyDigits(profile?.cpf).length !== 11) {
      missingFields.push("CPF válido");
    }

    if (hasCashItems && !hasText(profile?.pix_key)) {
      missingFields.push("Chave Pix");
    }

    if (missingFields.length > 0) {
      return {
        ok: false,
        error: `Complete seu cadastro antes de finalizar: ${missingFields.join(", ")}.`,
        redirectTo: "/minha-conta?next=/vender/checkout&missingProfile=1",
      };
    }

    return {
      ok: true,
      error: null,
      redirectTo: null,
    };
  }

  async function handleConfirm() {
    setErrorMsg(null);

    if (!hasItems) {
      setErrorMsg("Seu carrinho de venda está vazio.");
      return;
    }

    if (!isLoggedIn || !user?.id) {
      router.push("/entrar?next=/vender/checkout");
      return;
    }

    try {
      setCheckingProfile(true);

      const validation = await validateProfile();

      if (!validation.ok) {
        setErrorMsg(validation.error);

        if (validation.redirectTo) {
          router.push(validation.redirectTo);
        }

        return;
      }

      const res = await fetch("/api/buylist/create-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          cash_items: sellCart.cashItems.map((item) => ({
            sku_key: item.sku_key,
            quantity: item.quantity,
          })),
          store_credit_items: sellCart.storeCreditItems.map((item) => ({
            sku_key: item.sku_key,
            quantity: item.quantity,
          })),
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | CreateBatchResponse
        | null;

      if (!res.ok || !json?.ok) {
        const redirectTo =
          json && "redirect_to" in json ? json.redirect_to : null;

        const detail =
          json && "detail" in json && json.detail ? ` Detalhe: ${json.detail}` : "";

        const message =
          json && "error" in json
            ? `Não foi possível finalizar a venda: ${json.error}.${detail}`
            : "Não foi possível finalizar a venda.";

        setErrorMsg(message);

        if (redirectTo) {
          router.push(redirectTo);
        }

        return;
      }

      sellCart.clear();

      router.push(
        `/vender/sucesso?checkout_group_id=${encodeURIComponent(
          json.checkout_group_id
        )}`
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Não foi possível finalizar a venda.");
    } finally {
      setCheckingProfile(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-black md:text-5xl">
            Finalizar venda
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-black/65">
            Confira suas listas de venda antes de enviar a proposta para a Bodega
            Galática. Após a confirmação, você receberá as instruções de envio.
          </p>
        </div>

        {!hasItems ? (
          <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-8 text-white shadow-2xl">
            <h2 className="text-2xl font-semibold">Carrinho de venda vazio</h2>
            <p className="mt-3 text-white/70">
              Adicione cartas à sua lista antes de finalizar a venda.
            </p>

            <Link
              href="/vender"
              className="mt-6 inline-flex rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-[#0B0C10] transition hover:bg-orange-600"
            >
              Buscar cartas para vender
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-5 text-white shadow-2xl">
                <div className="text-xs uppercase tracking-wide text-white/45">
                  Dinheiro / Pix
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {formatMoneyBRL(sellCart.cashTotal)}
                </div>
                <div className="mt-2 text-sm text-white/55">
                  {sellCart.cashCount} item{sellCart.cashCount === 1 ? "" : "s"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-5 text-white shadow-2xl">
                <div className="text-xs uppercase tracking-wide text-white/45">
                  Crédito na loja
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {formatMoneyBRL(sellCart.storeCreditTotal)}
                </div>
                <div className="mt-2 text-sm text-white/55">
                  {sellCart.storeCreditCount} item
                  {sellCart.storeCreditCount === 1 ? "" : "s"}
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
                  Sujeito à conferência.
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <CheckoutList
                title="Recebimento em Dinheiro / Pix"
                description="Estas cartas gerarão uma oferta separada para pagamento via Pix após conferência."
                items={sellCart.cashItems}
              />

              <CheckoutList
                title="Recebimento em Crédito na loja"
                description="Estas cartas gerarão uma oferta separada para crédito em conta após conferência."
                items={sellCart.storeCreditItems}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-5 text-white shadow-2xl">
              <h2 className="text-xl font-semibold">Antes de confirmar</h2>

              <div className="mt-4 space-y-3 text-sm leading-7 text-white/70">
                <p>
                  Ao finalizar, o sistema poderá criar uma oferta para itens em Pix e
                  outra oferta para itens em crédito, mantendo as formas de recebimento
                  separadas.
                </p>

                <p>
                  Os valores são estimados e dependem da conferência física das cartas,
                  incluindo condição, acabamento, autenticidade e quantidade enviada.
                </p>

                {hasCashItems ? (
                  <p>
                    Como há itens para recebimento em dinheiro/Pix, sua Chave Pix será
                    obrigatória no cadastro.
                  </p>
                ) : (
                  <p>
                    Como todos os itens estão em crédito na loja, a Chave Pix não será
                    obrigatória neste checkout.
                  </p>
                )}
              </div>
            </div>

            {errorMsg ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-[#0B0C10]/95 px-4 py-3 text-sm text-amber-200 shadow-2xl">
                {errorMsg}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/vender/carrinho"
                className="rounded-full border border-black/15 bg-white px-6 py-3 text-center text-sm font-semibold text-black/80 shadow-sm transition hover:bg-black hover:text-white"
              >
                Voltar ao carrinho
              </Link>

              <Link
                href="/vender"
                className="rounded-full border border-black/15 bg-white px-6 py-3 text-center text-sm font-semibold text-black/80 shadow-sm transition hover:bg-black hover:text-white"
              >
                Continuar vendendo
              </Link>

              <button
                type="button"
                disabled={!hasItems || checkingProfile}
                onClick={handleConfirm}
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-[#0B0C10] transition hover:bg-orange-600 disabled:opacity-40"
              >
                {checkingProfile ? "Validando cadastro..." : "Confirmar venda"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}