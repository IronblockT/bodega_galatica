"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/hooks/useAuth";


type CartItemDetail = {
  sku_key: string;
  card_uid: string | null;
  name: string;
  subtitle: string | null;
  image_url: string | null;
  finish: string | null;
  condition: string | null;
  promo_type: string | null;
  price_brl: number | string | null;
};

const panelClass =
  "rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl";

function formatPrice(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, count, orderId, expiresAt, clear } = useCart();

  const { user } = useAuth();

  const [details, setDetails] = useState<CartItemDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [creatingPayment, setCreatingPayment] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      if (!items.length) {
        setDetails([]);
        return;
      }

      try {
        setLoadingDetails(true);

        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sku_keys: items.map((it) => it.sku_key),
          }),
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? "Falha ao carregar itens do checkout");
        }

        if (!cancelled) {
          setDetails(Array.isArray(json.items) ? json.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setDetails([]);
          console.error("[checkout-details]", err);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const detailBySku = useMemo(() => {
    return new Map(details.map((item) => [item.sku_key, item]));
  }, [details]);

  const checkoutRows = useMemo(() => {
    return items.map((it) => {
      const detail = detailBySku.get(it.sku_key);

      const unitPrice =
        typeof detail?.price_brl === "string"
          ? Number(detail.price_brl)
          : Number(detail?.price_brl ?? 0);

      const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
      const subtotal = safeUnitPrice * it.qty;

      return {
        ...it,
        detail,
        unitPrice: safeUnitPrice,
        subtotal,
      };
    });
  }, [items, detailBySku]);

  const total = useMemo(() => {
    return checkoutRows.reduce((sum, row) => sum + row.subtotal, 0);
  }, [checkoutRows]);

  if (!items.length) {
    return (
      <main className="relative min-h-screen bg-[#F6F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-10">
          <div className={panelClass}>
            <div className="p-6">
              <h1 className="text-3xl font-semibold text-white">Checkout</h1>
              <p className="mt-3 text-white/65">
                Seu carrinho está vazio.
              </p>

              <div className="mt-6 flex gap-3">
                <Link
                  href="/cartas"
                  className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors"
                >
                  Buscar cartas
                </Link>

                <Link
                  href="/carrinho"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors"
                >
                  Voltar ao carrinho
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  async function handleMercadoPagoCheckout() {
    try {
      setCheckoutError(null);

      if (!user?.id) {
        setCheckoutError("Você precisa estar logado para continuar.");
        return;
      }

      if (!orderId) {
        setCheckoutError("Pedido não encontrado. Volte ao carrinho e tente novamente.");
        return;
      }

      setCreatingPayment(true);

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          order_id: orderId,
          payer: {
            email: user.email ?? undefined,
          },
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? "Falha ao iniciar pagamento");
      }

      if (!json?.init_point) {
        throw new Error("O Mercado Pago não retornou a URL de pagamento.");
      }

      window.location.href = json.init_point;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Falha ao iniciar pagamento");
    } finally {
      setCreatingPayment(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
            Checkout
          </h1>
          <p className="mt-4 text-black/65">
            Revise seus itens antes de seguir para o pagamento.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className={panelClass}>
            <div className="p-6">
              <div className="mb-4 text-xs text-white/60">
                <div>
                  orderId: <span className="text-white/80">{orderId ?? "—"}</span>
                </div>
                <div>
                  expira em:{" "}
                  <span className="text-white/80">
                    {expiresAt ? new Date(expiresAt).toLocaleString("pt-BR") : "—"}
                  </span>
                </div>
              </div>

              {loadingDetails ? (
                <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-4 text-sm text-white/60">
                  Carregando itens...
                </div>
              ) : (
                <div className="space-y-3">
                  {checkoutRows.map((row) => (
                    <div
                      key={row.sku_key}
                      className="rounded-xl border border-white/10 bg-black/60 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-white/90">
                            {row.detail?.name ?? "Carta"}
                          </div>

                          {row.detail?.subtitle ? (
                            <div className="mt-1 text-sm text-white/65">
                              {row.detail.subtitle}
                            </div>
                          ) : null}

                          <div className="mt-1 text-xs text-white/55">
                            {[row.detail?.finish, row.detail?.condition]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-white/45">Preço unitário</div>
                              <div className="text-white/85">
                                {formatPrice(row.unitPrice) ?? "—"}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-white/45">Quantidade</div>
                              <div className="text-white/85">{row.qty}</div>
                            </div>

                            <div>
                              <div className="text-xs text-white/45">Subtotal</div>
                              <div className="font-semibold text-orange-300">
                                {formatPrice(row.subtotal) ?? "—"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/carrinho")}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 transition-colors"
                >
                  Voltar ao carrinho
                </button>

                <button
                  type="button"
                  onClick={() => clear()}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
                >
                  Limpar carrinho
                </button>
              </div>
            </div>
          </div>

          <aside className={panelClass}>
            <div className="p-6">
              <div className="text-sm font-semibold text-white/90">
                Resumo do pedido
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-white/70">
                  <span>Itens</span>
                  <span>{count}</span>
                </div>

                <div className="flex items-center justify-between text-white/90">
                  <span>Total</span>
                  <span className="text-lg font-semibold text-orange-300">
                    {formatPrice(total) ?? "—"}
                  </span>
                </div>
              </div>

              {checkoutError ? (
                <div className="mb-4 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-rose-200">
                  {checkoutError}
                </div>
              ) : null}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleMercadoPagoCheckout}
                  disabled={creatingPayment || loadingDetails || !orderId || items.length === 0}
                  className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors disabled:opacity-40"
                >
                  {creatingPayment ? "Abrindo Mercado Pago..." : "Pagar com Mercado Pago"}
                </button>
              </div>

              <div className="mt-3 text-xs text-white/45">
                Você será redirecionado ao Mercado Pago para concluir o pagamento.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}