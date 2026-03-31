import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";
import { CardSearchFilters } from "@/components/cards/CardSearchFilters";
import { BuylistSearchResults } from "@/components/buylist/BuylistSearchResults";

export default function VenderPage() {
  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
          <div className="mb-10">
            <h1 className="text-4xl font-semibold tracking-tight text-black md:text-5xl">
              Vender Cartas
            </h1>

            <p className="mt-5 max-w-3xl text-lg text-black/65">
              Busque suas cartas de Star Wars: Unlimited e veja quanto a Bodega
              Galática está pagando neste momento, com indicação de pagamento
              em dinheiro ou crédito na loja quando disponível.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-12 gap-6">
                <aside className="col-span-12 md:col-span-3">
                  <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-4 text-sm text-white/60">
                    Carregando filtros…
                  </div>
                </aside>

                <section className="col-span-12 md:col-span-9">
                  <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/70 p-4 text-sm text-white/60">
                    Carregando buylist…
                  </div>
                </section>
              </div>
            }
          >
            <div className="grid grid-cols-12 gap-6">
              <aside className="col-span-12 md:col-span-3">
                <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 backdrop-blur shadow-2xl">
                  <div className="sunset-line" />
                  <div className="p-4">
                    <CardSearchFilters />
                  </div>
                </div>
              </aside>

              <section className="col-span-12 md:col-span-9 space-y-6">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
                  <div className="sunset-line" />
                  <div className="px-6 py-6 md:px-8">
                    <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                      Buylist da Bodega Galática
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                      Veja instantaneamente o valor de recompra
                    </h2>

                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
                      Os valores exibidos abaixo seguem as regras atuais da nossa
                      buylist e podem variar conforme estoque, faixa de preço e
                      disponibilidade de caixa para recompra.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl">
                  <div className="sunset-line" />
                  <div className="p-4">
                    <BuylistSearchResults />
                  </div>
                </div>
              </section>
            </div>
          </Suspense>
        </div>

        <BackToTop />
      </main>

      <SiteFooter />
    </>
  );
}