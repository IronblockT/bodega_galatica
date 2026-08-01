"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  qty_available: number | string | null;
};

const panelClass =
  "rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl";

const btnPrimary =
  "rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors disabled:opacity-40";

function formatPrice(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function CarrinhoPage() {
  const {
    items,
    count,
    reserving,
    lastReserveError,
    orderId,
    expiresAt,
    reserveNow,
    setQty,
    removeItem,
    clear,
  } = useCart();

  const [details, setDetails] = useState<CartItemDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [updatingSku, setUpdatingSku] = useState<string | null>(null);

  async function handleQuantityChange(
    skuKey: string,
    nextQuantity: number,
    maxAvailable: number
  ) {
    if (updatingSku) return;

    setUpdatingSku(skuKey);

    try {
      await setQty(
        skuKey,
        Math.max(0, nextQuantity),
        Math.max(0, maxAvailable)
      );
    } finally {
      setUpdatingSku(null);
    }
  }

  async function handleRemoveItem(skuKey: string) {
    if (updatingSku) return;

    setUpdatingSku(skuKey);

    try {
      await removeItem(skuKey);
    } finally {
      setUpdatingSku(null);
    }
  }

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
          throw new Error(json?.error ?? "Falha ao carregar itens do carrinho");
        }

        if (!cancelled) {
          setDetails(Array.isArray(json.items) ? json.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setDetails([]);
          console.error("[cart-page-details]", err);
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

  const cartRows = useMemo(() => {
    return items.map((it) => {
      const detail = detailBySku.get(it.sku_key);

      const unitPrice =
        typeof detail?.price_brl === "string"
          ? Number(detail.price_brl)
          : Number(detail?.price_brl ?? 0);

      const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;

      const rawAvailable =
        typeof detail?.qty_available === "string"
          ? Number(detail.qty_available)
          : Number(detail?.qty_available ?? 0);

      const qtyAvailable = Number.isFinite(rawAvailable)
        ? Math.max(0, Math.floor(rawAvailable))
        : 0;

      const subtotal = safeUnitPrice * it.qty;

      return {
        ...it,
        detail,
        unitPrice: safeUnitPrice,
        qtyAvailable,
        subtotal,
      };
    });
  }, [items, detailBySku]);

  const cartTotal = useMemo(() => {
    return cartRows.reduce((sum, row) => sum + row.subtotal, 0);
  }, [cartRows]);

  const router = useRouter();

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
            Carrinho
          </h1>
          <p className="mt-4 text-black/65">
            {count ? `${count} item(ns) no carrinho` : "Seu carrinho está vazio."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className={panelClass}>
            <div className="p-6">
              <div className="mb-4 text-xs text-white/60">
                <div>
                  orderId: <span className="text-white/80">{orderId ?? "—"}</span>
                </div>
                <div>
                  expiresAt: <span className="text-white/80">{expiresAt ?? "—"}</span>
                </div>
              </div>

              {lastReserveError ? (
                <div className="mb-4 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-rose-200">
                  {lastReserveError}
                </div>
              ) : null}

              {items.length === 0 ? (
                <div className="text-sm text-white/60">
                  Voltar para{" "}
                  <Link href="/cartas" className="text-orange-300 hover:underline">
                    Buscar Cartas
                  </Link>
                </div>
              ) : loadingDetails ? (
                <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-4 text-sm text-white/60">
                  Carregando detalhes do carrinho...
                </div>
              ) : (
                <div className="space-y-3">
                  {cartRows.map((row) => (
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

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  aria-label={`Diminuir quantidade de ${row.detail?.name ?? "item"}`}
                                  disabled={updatingSku !== null}
                                  onClick={() =>
                                    void handleQuantityChange(
                                      row.sku_key,
                                      row.qty - 1,
                                      row.qtyAvailable
                                    )
                                  }
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base font-semibold text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  −
                                </button>

                                <span className="min-w-6 text-center font-semibold text-white/90">
                                  {row.qty}
                                </span>

                                <button
                                  type="button"
                                  aria-label={`Aumentar quantidade de ${row.detail?.name ?? "item"}`}
                                  disabled={
                                    updatingSku !== null ||
                                    row.qty >= row.qtyAvailable
                                  }
                                  onClick={() =>
                                    void handleQuantityChange(
                                      row.sku_key,
                                      row.qty + 1,
                                      row.qtyAvailable
                                    )
                                  }
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base font-semibold text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  +
                                </button>

                                <button
                                  type="button"
                                  disabled={updatingSku !== null}
                                  onClick={() =>
                                    void handleRemoveItem(row.sku_key)
                                  }
                                  className="ml-1 text-xs font-semibold text-rose-300 transition-colors hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {updatingSku === row.sku_key
                                    ? "Atualizando..."
                                    : "Remover"}
                                </button>
                              </div>
                              <div className="mt-1 text-[11px] text-white/45">
                                Máximo disponível: {row.qtyAvailable}
                              </div>
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

              <div className="mt-6 flex flex-wrap gap-2 justify-end">
                <button
                  className={btnPrimary}
                  disabled={items.length === 0 || reserving}
                  onClick={async () => {
                    await reserveNow();
                    router.push("/checkout");
                  }}
                >
                  {reserving ? "Preparando..." : "Finalizar compra"}
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

          <aside className={panelClass}>
            <div className="p-6">
              <div className="text-sm font-semibold text-white/90">Resumo do pedido</div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-white/70">
                  <span>Itens</span>
                  <span>{count}</span>
                </div>

                <div className="flex items-center justify-between text-white/90">
                  <span>Total</span>
                  <span className="text-lg font-semibold text-orange-300">
                    {formatPrice(cartTotal) ?? "—"}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors disabled:opacity-40"
                  disabled={items.length === 0 || reserving}
                  onClick={async () => {
                    await reserveNow();
                    router.push("/checkout");
                  }}
                >
                  {reserving ? "Preparando..." : "Finalizar compra"}
                </button>
              </div>

              <div className="mt-3 text-xs text-white/45">
                Seus itens serão preparados para a etapa de pagamento.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}