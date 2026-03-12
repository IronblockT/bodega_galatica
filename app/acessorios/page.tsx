// app/acessorios/page.tsx
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";

export default function AccessoriesPage() {
  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        {/* fundo sutil */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
          {/* topo */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              Acessórios
            </h1>

            <p className="mt-5 text-lg text-black/65">
              Em breve você poderá comprar sleeves, deck boxes, playmats, binders
              e outros acessórios aqui na Bodega Galática.
            </p>
          </div>

          {/* card principal */}
          <section className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 backdrop-blur shadow-2xl overflow-hidden">
            <div className="sunset-line" />

            <div className="px-6 py-10 md:px-10 md:py-14">
              <div className="mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                  Em breve
                </div>

                <h2 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight text-white">
                  Nossa seção de acessórios está chegando
                </h2>

                <p className="mt-4 text-base md:text-lg leading-7 text-white/65">
                  Estamos preparando essa área para oferecer acessórios com o
                  mesmo cuidado que aplicamos às cartas. Assim que o catálogo
                  estiver pronto, esta página será atualizada com os produtos
                  disponíveis.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/cartas"
                    className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-sm font-semibold text-[#0B0C10] transition-colors hover:from-orange-500 hover:to-orange-600"
                  >
                    Explorar cartas
                  </Link>

                  <Link
                    href="/"
                    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                  >
                    Voltar para a home
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* bloco complementar */}
          <section className="mt-6 rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl overflow-hidden">
            <div className="sunset-line" />

            <div className="grid gap-4 px-6 py-6 md:grid-cols-3 md:px-8">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold text-white">Sleeves</div>
                <p className="mt-2 text-sm text-white/60">
                  Proteção para decks competitivos e coleção.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold text-white">Deck Boxes</div>
                <p className="mt-2 text-sm text-white/60">
                  Organização prática para transporte e armazenamento.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold text-white">Playmats e mais</div>
                <p className="mt-2 text-sm text-white/60">
                  Itens para melhorar sua experiência de jogo e coleção.
                </p>
              </div>
            </div>
          </section>
        </div>

        <BackToTop />
      </main>

      <SiteFooter />
    </>
  );
}