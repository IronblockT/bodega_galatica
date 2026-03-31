import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";

const SHIP_TO_NAME = "Bodega Galática";
const SHIP_TO_ADDRESS_LINE_1 = "Alameda Pelotas 397";
const SHIP_TO_ADDRESS_LINE_2 = "Santana de Parnaiba - São Paulo - 06543-210";
const SHIP_TO_COUNTRY = "Brasil";
const SUPPORT_CONTACT = "Contato@bgexchange.com.br";

export default async function VenderSucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ offer_id?: string; payout_type?: string }>;
}) {
  const sp = await searchParams;
  const offerId = String(sp?.offer_id ?? "").trim();
  const payoutType = String(sp?.payout_type ?? "").trim();

  const payoutLabel =
    payoutType === "store_credit"
      ? "Crédito na loja"
      : payoutType === "cash"
      ? "Dinheiro"
      : "—";

  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
            <div className="sunset-line" />

            <div className="p-8 md:p-10">
              <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                Oferta enviada
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Sua oferta foi criada com sucesso
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">
                Recebemos sua solicitação de venda. Agora o próximo passo é preparar
                a carta corretamente e enviar para a Bodega Galática. Depois do
                recebimento e conferência, seguimos com a conclusão da sua oferta.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/75">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Offer ID
                  </div>
                  <div className="mt-2 break-all font-mono text-white">
                    {offerId || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/75">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Forma de recebimento escolhida
                  </div>
                  <div className="mt-2 text-white">{payoutLabel}</div>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Como funciona a partir de agora
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                  <p>
                    <span className="font-semibold text-white">1.</span> Sua oferta foi
                    registrada no sistema com os dados da carta, quantidade e forma de
                    recebimento escolhida.
                  </p>

                  <p>
                    <span className="font-semibold text-white">2.</span> Você deve
                    preparar a carta com proteção adequada e enviar para o endereço da
                    Bodega Galática.
                  </p>

                  <p>
                    <span className="font-semibold text-white">3.</span> Quando a carta
                    chegar, ela será conferida quanto a condição, autenticidade,
                    acabamento e conformidade com a oferta criada.
                  </p>

                  <p>
                    <span className="font-semibold text-white">4.</span> Se a carta
                    estiver de acordo com o esperado, a oferta seguirá para conclusão e
                    pagamento ou crédito na loja, conforme a opção escolhida.
                  </p>

                  <p>
                    <span className="font-semibold text-white">5.</span> Caso haja
                    divergência relevante de condição, quantidade ou outro ponto
                    importante, a oferta poderá passar por revisão antes da finalização.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Como preparar sua carta para envio
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                  <p>
                    <span className="font-semibold text-white">Proteção individual:</span>{" "}
                    coloque a carta primeiro em um sleeve de boa qualidade.
                  </p>

                  <p>
                    <span className="font-semibold text-white">Proteção rígida:</span>{" "}
                    depois do sleeve, use top loader, card saver ou outra proteção
                    rígida equivalente para evitar dobras e pressão.
                  </p>

                  <p>
                    <span className="font-semibold text-white">Fixação segura:</span>{" "}
                    se enviar mais de uma carta, organize tudo de forma que as cartas não
                    fiquem soltas dentro da embalagem.
                  </p>

                  <p>
                    <span className="font-semibold text-white">Evite contato com umidade:</span>{" "}
                    sempre que possível, use proteção adicional como saquinho plástico,
                    zip bag ou camada protetora equivalente.
                  </p>

                  <p>
                    <span className="font-semibold text-white">Embalagem externa:</span>{" "}
                    use envelope reforçado ou caixa pequena, conforme a quantidade e valor
                    das cartas. Cartas de maior valor devem receber proteção extra.
                  </p>

                  <p>
                    <span className="font-semibold text-white">Identificação:</span>{" "}
                    inclua dentro da embalagem uma identificação com seu nome e, se
                    possível, o <span className="font-mono text-white">Offer ID</span> da
                    proposta para facilitar a conferência.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Endereço para envio
                </h2>

                <div className="mt-4 space-y-1 text-sm leading-7 text-orange-100">
                  <div className="font-semibold">{SHIP_TO_NAME}</div>
                  <div>{SHIP_TO_ADDRESS_LINE_1}</div>
                  <div>{SHIP_TO_ADDRESS_LINE_2}</div>
                  <div>{SHIP_TO_COUNTRY}</div>
                </div>                
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Dicas importantes
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                  <p>
                    Tire fotos da carta e da embalagem antes do envio, principalmente em
                    casos de cartas de maior valor.
                  </p>

                  <p>
                    Sempre que possível, utilize uma modalidade de envio com rastreio.
                  </p>

                  <p>
                    Guarde o comprovante de postagem até a conclusão da sua oferta.
                  </p>

                  <p>
                    Em caso de dúvida sobre embalagem, envio ou conferência, entre em
                    contato com a equipe da Bodega Galática antes de postar.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Suporte
                </h2>

                <p className="mt-4 text-sm leading-7 text-white/70">
                  Canal de suporte para dúvidas sobre envio, conferência e andamento da
                  oferta:
                </p>

                <div className="mt-3 text-sm font-semibold text-white">
                  {SUPPORT_CONTACT}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/vender"
                  className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-center text-sm font-semibold text-[#0B0C10] transition-colors hover:from-orange-500 hover:to-orange-600"
                >
                  Fazer nova oferta
                </Link>

                <Link
                  href="/"
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  Voltar para a home
                </Link>
              </div>
            </div>
          </div>
        </div>

        <BackToTop />
      </main>

      <SiteFooter />
    </>
  );
}