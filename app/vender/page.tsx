// app/vender/page.tsx
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";
import Image from "next/image";

export default function VenderPage() {
    return (
        <>
            <main className="relative min-h-screen bg-[#F6F0E6]">
                {/* fundo sutil */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

                <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
                    {/* HERO */}
                    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
                        <div className="sunset-line" />

                        <div className="grid gap-8 px-6 py-10 md:grid-cols-2 md:px-10 md:py-14">
                            <div className="flex flex-col justify-center">
                                <div className="inline-flex w-fit items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                                    Venda suas cartas
                                </div>

                                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                                    Em breve, você poderá vender cartas para a Bodega Galática
                                </h1>

                                <p className="mt-6 text-base leading-7 text-white/70 md:text-lg">
                                    Estamos preparando uma nova funcionalidade para que jogadores e
                                    colecionadores possam vender cartas diretamente para a Bodega
                                    Galática.
                                </p>

                                <p className="mt-4 text-base leading-7 text-white/70">
                                    A ideia é simples: quando nosso inventário de determinadas cartas
                                    estiver baixo, poderemos abrir interesse de compra para reforçar
                                    nosso estoque. Se você tiver essas cartas, poderá enviá-las para
                                    avaliação e venda.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

                            <div className="flex items-center">
                                <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 md:h-[420px]">
                                    <Image
                                        src="/vender/vender-hero.png"
                                        alt="Venda suas cartas na Bodega Galática"
                                        fill
                                        priority
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* COMO VAI FUNCIONAR */}
                    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/70 shadow-2xl backdrop-blur">
                        <div className="sunset-line" />

                        <div className="px-6 py-8 md:px-10 md:py-10">
                            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                                Como vai funcionar
                            </h2>

                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                                    <div className="text-sm font-semibold text-white">
                                        1. Interesse da loja
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-white/60">
                                        A BG poderá sinalizar quais cartas estão com inventário baixo e
                                        informar claramente quanto está pagando por cada uma delas.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                                    <div className="text-sm font-semibold text-white">
                                        2. Valor já definido
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-white/60">
                                        Se você tiver a carta procurada, já saberá antecipadamente o valor
                                        oferecido pela loja, sem necessidade de enviar proposta.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                                    <div className="text-sm font-semibold text-white">
                                        3. Mais valor em crédito
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-white/60">
                                        Quem optar por receber em crédito na loja poderá obter um valor mais
                                        vantajoso pelas cartas, aumentando seu poder de compra dentro da BG.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* MENSAGEM TEMPORÁRIA */}
                    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
                        <div className="sunset-line" />

                        <div className="px-6 py-10 text-center md:px-10">
                            <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                                Em desenvolvimento
                            </div>

                            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                                Esta funcionalidade ainda está sendo preparada
                            </h2>

                            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
                                Por enquanto, esta página funciona como um placeholder. Em breve,
                                a Bodega Galática disponibilizará um fluxo próprio para compra de
                                cartas de clientes, com critérios claros, avaliação e comunicação
                                transparente.
                            </p>

                            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <Link
                                    href="/sobre"
                                    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                                >
                                    Conhecer a Bodega Galática
                                </Link>

                                <Link
                                    href="/cartas"
                                    className="rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-rose-200 px-6 py-3 text-sm font-semibold text-[#0B0C10] shadow-[0_12px_32px_rgba(245,158,11,.22)] transition hover:brightness-[1.03]"
                                >
                                    Ver cartas disponíveis
                                </Link>
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