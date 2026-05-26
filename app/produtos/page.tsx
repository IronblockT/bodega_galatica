// app/produtos/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";
import { useCart } from "@/components/cart/CartProvider";
import { useRouter, useSearchParams } from "next/navigation";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  expansion_code: string | null;
  description: string | null;
  image_url: string | null;
  price_brl: number | string;
  qty_available: number;
};

function formatPrice(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(n)) {
    return "—";
  }

  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function categoryLabel(category: string | null | undefined) {
  const c = String(category ?? "").toLowerCase();

  if (c === "sealed") return "Produto selado";
  if (c === "accessory") return "Acessório";
  if (c === "merch") return "Merch";
  if (c === "bodega_product") return "Produto Bodega";

  return category ?? "Produto";
}

function ProdutosPageContent() {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCategory = searchParams.get("category") ?? "";

  const [category, setCategory] = useState(initialCategory);
  const [stockOnly, setStockOnly] = useState(true);

  const { addProduct } = useCart();
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category") ?? "";
    setCategory(categoryFromUrl);
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const params = new URLSearchParams();

        if (category) {
          params.set("category", category);
        }

        if (stockOnly) {
          params.set("stock", "1");
        }

        const query = params.toString();

        const res = await fetch(`/api/products${query ? `?${query}` : ""}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? "Falha ao carregar produtos");
        }

        if (!active) return;

        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (error) {
        console.error("[produtos]", error);

        if (!active) return;

        setItems([]);
        setErrorMsg(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os produtos."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [category, stockOnly]);

  const totalProducts = useMemo(() => items.length, [items]);

  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
          <div className="mb-10">
            <h1 className="text-4xl font-semibold tracking-tight text-black md:text-5xl">
              Produtos
            </h1>

            <p className="mt-5 max-w-3xl text-lg text-black/65">
              Encontre produtos selados, acessórios, merch e itens especiais da
              Bodega Galáctica.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <aside className="col-span-12 md:col-span-3">
              <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 backdrop-blur shadow-2xl">
                <div className="sunset-line" />

                <div className="p-4">
                  <div className="text-sm font-semibold text-white">
                    Filtros
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                        Categoria
                      </label>

                      <select
                        value={category}
                        onChange={(e) => {
                          const nextCategory = e.target.value;
                          setCategory(nextCategory);

                          const params = new URLSearchParams(
                            searchParams.toString()
                          );

                          if (nextCategory) {
                            params.set("category", nextCategory);
                          } else {
                            params.delete("category");
                          }

                          const query = params.toString();

                          router.push(
                            query ? `/produtos?${query}` : "/produtos"
                          );
                        }}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-400"
                      >
                        <option value="">Todas</option>
                        <option value="sealed">Produtos selados</option>
                        <option value="accessory">Acessórios</option>
                        <option value="merch">Merch</option>
                        <option value="bodega_product">Produtos Bodega</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={stockOnly}
                        onChange={(e) => setStockOnly(e.target.checked)}
                      />
                      Somente disponíveis
                    </label>
                  </div>
                </div>
              </div>
            </aside>

            <section className="col-span-12 md:col-span-9">
              <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl">
                <div className="sunset-line" />

                <div className="p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Catálogo de produtos
                      </h2>

                      <p className="mt-1 text-sm text-white/55">
                        {loading
                          ? "Carregando produtos..."
                          : `${totalProducts} produto(s) encontrado(s).`}
                      </p>
                    </div>

                    <Link
                      href="/cartas"
                      className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 md:inline-flex"
                    >
                      Ver singles
                    </Link>
                  </div>

                  {errorMsg ? (
                    <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-rose-200">
                      {errorMsg}
                    </div>
                  ) : null}

                  {loading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={index}
                          className="overflow-hidden rounded-2xl border border-white/10 bg-black/50"
                        >
                          <div className="h-56 animate-pulse bg-white/5" />

                          <div className="space-y-2 p-4">
                            <div className="h-4 animate-pulse rounded bg-white/10" />
                            <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-6 text-sm text-white/60">
                      Nenhum produto encontrado com os filtros selecionados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((product) => (
                        <div key={product.id} className="h-full">
                          <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60 transition hover:border-orange-400/40">
                            <div className="relative h-56 shrink-0 bg-[#07080A]">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-full w-full object-contain p-4 transition-transform group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm text-white/35">
                                  Produto sem imagem
                                </div>
                              )}

                              <div className="absolute left-3 top-3 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold text-white">
                                {categoryLabel(product.category)}
                              </div>

                              {product.expansion_code ? (
                                <div className="absolute right-3 top-3 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-black">
                                  {product.expansion_code}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-1 flex-col p-4">
                              <h3 className="min-h-[56px] text-base font-semibold leading-7 text-white">
                                <span className="line-clamp-2">
                                  {product.name}
                                </span>
                              </h3>

                              <div className="mt-2 min-h-[72px]">
                                {product.description ? (
                                  <p className="line-clamp-3 text-sm text-white/55">
                                    {product.description}
                                  </p>
                                ) : (
                                  <p className="text-sm text-transparent">.</p>
                                )}
                              </div>

                              <div className="mt-4 text-xs text-white/45">
                                Estoque disponível:{" "}
                                <span className="font-semibold text-white/75">
                                  {product.qty_available}
                                </span>
                              </div>

                              <div className="mt-auto pt-5">
                                <div className="text-lg font-semibold text-orange-300">
                                  {formatPrice(product.price_brl)}
                                </div>

                                <button
                                  type="button"
                                  disabled={product.qty_available <= 0}
                                  onClick={() => {
                                    addProduct(product.id, 1);
                                    setAddedProductId(product.id);

                                    window.setTimeout(() => {
                                      setAddedProductId((current) =>
                                        current === product.id ? null : current
                                      );
                                    }, 1400);
                                  }}
                                  className="mt-4 w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-[#0B0C10] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {product.qty_available <= 0
                                    ? "Indisponível"
                                    : addedProductId === product.id
                                      ? "Adicionado!"
                                      : "Adicionar ao carrinho"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <BackToTop />
      </main>

      <SiteFooter />
    </>
  );
}

export default function ProdutosPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F6F0E6] px-4 py-10">
          <div className="mx-auto max-w-6xl rounded-2xl border border-black/10 bg-white/60 p-6 text-black/70">
            Carregando produtos...
          </div>
        </main>
      }
    >
      <ProdutosPageContent />
    </Suspense>
  );
}