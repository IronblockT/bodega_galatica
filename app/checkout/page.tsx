"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";


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

type CheckoutSettingsRow = {
  id: string;
  shipping_flat_brl: number | string;
  coupon_discount_percent: number | string;
  free_shipping_min_brl: number | string;
};

type StoreCreditRow = {
  user_id: string;
  balance_brl: number | string;
};

type CouponValidation = {
  applied: boolean;
  code: string;
  active: boolean;
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

  const [settings, setSettings] = useState<CheckoutSettingsRow | null>(null);
  const [storeCredit, setStoreCredit] = useState<StoreCreditRow | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponInfo, setCouponInfo] = useState<CouponValidation | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutMeta() {
      try {
        const { data: settingsRows, error: settingsErr } = await supabase
          .from("checkout_settings")
          .select("id, shipping_flat_brl, coupon_discount_percent, free_shipping_min_brl")
          .limit(1);

        if (settingsErr) {
          throw settingsErr;
        }

        if (!cancelled) {
          setSettings((settingsRows?.[0] as CheckoutSettingsRow) ?? null);
        }

        if (user?.id) {
          const { data: creditRow, error: creditErr } = await supabase
            .from("user_store_credit")
            .select("user_id, balance_brl")
            .eq("user_id", user.id)
            .maybeSingle();

          if (creditErr) {
            throw creditErr;
          }

          if (!cancelled) {
            setStoreCredit((creditRow as StoreCreditRow) ?? null);
          }
        } else if (!cancelled) {
          setStoreCredit(null);
        }
      } catch (err) {
        console.error("[checkout-meta]", err);
        if (!cancelled) {
          setSettings(null);
          setStoreCredit(null);
        }
      }
    }

    loadCheckoutMeta();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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

  const subtotal = total;

  const shipping = useMemo(() => {
    const flat = Number(settings?.shipping_flat_brl ?? 0);
    const freeMin = Number(settings?.free_shipping_min_brl ?? 0);

    if (Number.isFinite(freeMin) && freeMin > 0 && subtotal >= freeMin) {
      return 0;
    }

    return Number.isFinite(flat) ? flat : 0;
  }, [settings, subtotal]);

  const couponDiscount = useMemo(() => {
    if (!couponInfo?.applied) return 0;

    const percent = Number(settings?.coupon_discount_percent ?? 0);
    if (!Number.isFinite(percent) || percent <= 0) return 0;

    return subtotal * (percent / 100);
  }, [couponInfo, settings, subtotal]);

  const availableCredit = useMemo(() => {
    const n = Number(storeCredit?.balance_brl ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [storeCredit]);

  const creditEligibleSubtotal = useMemo(() => {
    return Math.max(subtotal - couponDiscount, 0);
  }, [subtotal, couponDiscount]);

  const appliedCredit = useMemo(() => {
    return Math.min(availableCredit, creditEligibleSubtotal);
  }, [availableCredit, creditEligibleSubtotal]);

  const finalTotal = useMemo(() => {
    return Math.max(creditEligibleSubtotal - appliedCredit + shipping, 0);
  }, [creditEligibleSubtotal, appliedCredit, shipping]);

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
          shipping_brl: shipping,
          coupon_code: couponInfo?.applied ? couponInfo.code : null,
          coupon_discount_brl: couponDiscount,
          store_credit_applied_brl: appliedCredit,
          final_total_brl: finalTotal,
          payer: {
            email: user.email ?? undefined,
          },
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? "Falha ao iniciar pagamento");
      }

      if (json?.paid_with_store_credit) {
        clear();
        router.push(`/checkout/success?order=${json.order_id}`);
        return;
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

  async function handleApplyCoupon() {
    try {
      setCouponChecking(true);
      setCouponError(null);

      const normalized = couponCode.trim().toUpperCase();

      if (!normalized) {
        setCouponInfo(null);
        setCouponError("Digite um cupom.");
        return;
      }

      const { data, error } = await supabase
        .from("checkout_coupons")
        .select("code, active")
        .eq("code", normalized)
        .eq("active", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setCouponInfo(null);
        setCouponError("Cupom inválido ou inativo.");
        return;
      }

      setCouponInfo({
        applied: true,
        code: data.code,
        active: true,
      });
    } catch (err) {
      console.error("[coupon-apply]", err);
      setCouponInfo(null);
      setCouponError("Não foi possível validar o cupom.");
    } finally {
      setCouponChecking(false);
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

                <div className="flex items-center justify-between text-white/70">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal) ?? "—"}</span>
                </div>

                <div className="flex items-center justify-between text-white/70">
                  <span>Frete</span>
                  <span>
                    {shipping === 0 && subtotal >= Number(settings?.free_shipping_min_brl ?? 0) && Number(settings?.free_shipping_min_brl ?? 0) > 0
                      ? "Grátis"
                      : formatPrice(shipping) ?? "—"}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <div className="text-xs text-white/55">Cupom de desconto</div>

                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError(null);
                        setCouponInfo(null);
                      }}
                      placeholder="Digite seu cupom"
                      className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white placeholder:text-white/35 outline-none focus:border-orange-400"
                    />

                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponChecking}
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {couponChecking ? "Validando..." : "Aplicar"}
                    </button>
                  </div>

                  {couponError ? (
                    <div className="mt-2 text-xs text-rose-200">{couponError}</div>
                  ) : null}

                  {couponInfo?.applied ? (
                    <div className="mt-2 text-xs text-emerald-200">
                      Cupom {couponInfo.code} aplicado ({Number(settings?.coupon_discount_percent ?? 0)}% de desconto)
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-white/70">
                  <span>Desconto do cupom</span>
                  <span>- {formatPrice(couponDiscount) ?? "—"}</span>
                </div>

                <div className="flex items-center justify-between text-white/70">
                  <span>Crédito em conta</span>
                  <span>- {formatPrice(appliedCredit) ?? "—"}</span>
                </div>

                <div className="text-[11px] text-white/45">
                  Saldo disponível: {formatPrice(availableCredit) ?? "—"}
                </div>

                <div className="flex items-center justify-between text-white/90 border-t border-white/10 pt-3">
                  <span>Total final</span>
                  <span className="text-lg font-semibold text-orange-300">
                    {formatPrice(finalTotal) ?? "—"}
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