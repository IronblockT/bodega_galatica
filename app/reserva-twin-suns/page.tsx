import { BackToTop } from "@/components/layout/BackToTop";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ReservaTwinSunsForm } from "@/components/reserva/ReservaTwinSunsForm";

export default function ReservaTwinSunsPage() {
  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-12 gap-6">
            {/* COLUNA ESQUERDA */}
            <section className="col-span-12 md:col-span-5 space-y-6">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
                <div className="sunset-line" />
                <div className="px-6 py-6 md:px-8">
                  <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                    Pré-venda exclusiva
                  </div>

                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Reserva dos decks de Twin Suns
                  </h1>

                  <p className="mt-4 text-sm leading-7 text-white/70 md:text-base">
                    Preencha o formulário para registrar seu interesse na
                    pré-venda dos novos decks de Star Wars: Unlimited.
                  </p>

                  <p className="mt-3 text-sm leading-7 text-white/70 md:text-base">
                    As solicitações serão consideradas por ordem de envio e
                    estarão sujeitas à disponibilidade de estoque no lançamento.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/70 shadow-2xl backdrop-blur">
                <div className="sunset-line" />
                <div className="px-6 py-6 md:px-8">
                  <h2 className="text-lg font-semibold text-white">
                    Como vai funcionar
                  </h2>

                  <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                    <p>
                      1. Você envia sua solicitação de reserva informando a
                      quantidade desejada.
                    </p>
                    <p>
                      2. A equipe da Bodega Galática consolida os pedidos
                      recebidos.
                    </p>
                    <p>
                      3. Quando a disponibilidade do produto for confirmada,
                      entraremos em contato com os próximos passos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-red-400/25 bg-red-500/12 shadow-2xl backdrop-blur">
                <div className="px-6 py-5 md:px-8">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-red-900">
                    Importante
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-red-950">
                    O envio deste formulário representa uma intenção de reserva
                    e não garante atendimento automático. A confirmação final
                    dependerá da quantidade disponível no estoque de lançamento.
                  </p>
                </div>
              </div>
            </section>

            {/* COLUNA DIREITA */}
            <section className="col-span-12 md:col-span-7">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
                <div className="sunset-line" />
                <div className="px-6 py-6 md:px-8">
                  <div className="mb-6">
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                      Formulário de reserva
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                      Garanta sua prioridade na fila
                    </h2>

                    <p className="mt-3 text-sm leading-7 text-white/70 md:text-base">
                      Complete os campos abaixo para registrar seu pedido de
                      pré-venda.
                    </p>
                  </div>

                  <ReservaTwinSunsForm />
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