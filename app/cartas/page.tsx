// app/cartas/page.tsx
import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";

import { CardSearchFilters } from "@/components/cards/CardSearchFilters";
import { CardSearchResults } from "@/components/cards/CardSearchResults";

export default function CardsPage() {
  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        {/* fundo sutil (hero-like) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        {/* Conteúdo */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
          {/* Top bar */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              Buscar Cartas
            </h1>

            <p className="mt-5 text-lg text-black/65">
              Encontre cartas de Star Wars: Unlimited por set, tipo, aspectos e condição.
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
                    Carregando resultados…
                  </div>
                </section>
              </div>
            }
          >
            <div className="grid grid-cols-12 gap-6">
              {/* Filtros */}
              <aside className="col-span-12 md:col-span-3">
                <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 backdrop-blur shadow-2xl">
                  <div className="sunset-line" />
                  <div className="p-4">
                    <CardSearchFilters />
                  </div>
                </div>
              </aside>

              {/* Resultados */}
              <section className="col-span-12 md:col-span-9">
                <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl">
                  <div className="sunset-line" />
                  <div className="p-4">
                    <CardSearchResults />
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
