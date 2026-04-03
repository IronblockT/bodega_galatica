import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";

export default function CommunityPage() {
  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        {/* fundo sutil */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
          {/* topo */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              Comunidade
            </h1>

            <p className="mt-5 text-lg text-black/65">
              Em breve você poderá acompanhar novidades, conteúdos, iniciativas
              da comunidade e mais experiências conectadas ao universo da
              Bodega Galática.
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
                  Nossa área de comunidade está chegando
                </h2>

                <p className="mt-4 text-base md:text-lg leading-7 text-white/65">
                  Estamos preparando este espaço para reunir conteúdos,
                  novidades, interação entre jogadores e iniciativas ligadas ao
                  ecossistema da Bodega Galática. Assim que estiver pronta, esta
                  página será atualizada com tudo o que a comunidade poderá
                  acessar.
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
                <div className="text-sm font-semibold text-white">Conteúdo</div>
                <p className="mt-2 text-sm text-white/60">
                  Guias, novidades, destaques e atualizações para jogadores e colecionadores.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold text-white">Eventos</div>
                <p className="mt-2 text-sm text-white/60">
                  Espaço para acompanhar iniciativas, encontros e ações da comunidade.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold text-white">BGON</div>
                <p className="mt-2 text-sm text-white/60">
                  Integrações e experiências sociais conectadas ao universo da Bodega.
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