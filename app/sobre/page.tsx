// app/sobre/page.tsx
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";
import Image from "next/image";

function ImagePlaceholder({
    label,
    height = "h-[280px]",
}: {
    label: string;
    height?: string;
}) {
    return (
        <div
            className={[
                "w-full rounded-2xl border border-dashed border-white/15 bg-black/30",
                "flex items-center justify-center text-center",
                "px-6 text-sm text-white/40",
                height,
            ].join(" ")}
        >
            {label}
        </div>
    );
}

export default function SobrePage() {
    return (
        <>
            <main className="relative min-h-screen bg-[#F6F0E6]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

                <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
                    {/* HERO */}
                    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
                        <div className="sunset-line" />

                        <div className="grid gap-8 px-6 py-10 md:grid-cols-2 md:px-10 md:py-14">
                            <div className="flex flex-col justify-center">
                                <div className="inline-flex w-fit items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                                    Sobre a Bodega Galática
                                </div>

                                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                                    Nascemos da paixão por TCGs e pelo universo de Star Wars
                                </h1>

                                <p className="mt-6 text-base leading-7 text-white/70 md:text-lg">
                                    A Bodega Galática nasceu da paixão verdadeira por Trading Card
                                    Games e pelo universo de Star Wars. Mais do que vender cartas,
                                    nosso objetivo é construir um espaço de confiança para jogadores,
                                    colecionadores e fãs que querem encontrar tudo o que precisam
                                    em um só lugar.
                                </p>

                                <p className="mt-4 text-base leading-7 text-white/70">
                                    Queremos ajudar a fortalecer o mercado secundário de Star Wars:
                                    Unlimited no Brasil, criando uma loja que se torne referência
                                    pela variedade, pela experiência e pela proximidade com a
                                    comunidade.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <Link
                                        href="/cartas"
                                        className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-sm font-semibold text-[#0B0C10] transition-colors hover:from-orange-500 hover:to-orange-600"
                                    >
                                        Explorar cartas
                                    </Link>

                                    <Link
                                        href="/comunidade"
                                        className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                                    >
                                        Conhecer o ecossistema BG
                                    </Link>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 md:h-[420px]">
                                    <Image
                                        src="/sobre/sobre-hero.png"
                                        alt="Bodega Galática"
                                        fill
                                        priority
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* HISTÓRIA */}
                    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/70 shadow-2xl backdrop-blur">
                        <div className="sunset-line" />

                        <div className="grid gap-8 px-6 py-8 md:grid-cols-2 md:px-10 md:py-10">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                                    Nossa história
                                </h2>

                                <div className="mt-5 space-y-4 text-sm leading-7 text-white/70 md:text-base">
                                    <p>
                                        A Bodega Galática nasceu da combinação de duas paixões:
                                        o fascínio pelos TCGs e a força atemporal do universo Star Wars.
                                        Desde o início, a visão sempre foi clara: criar um projeto que
                                        fosse além de uma loja comum.
                                    </p>

                                    <p>
                                        Em muitos momentos, jogadores encontram dificuldade para achar
                                        cartas específicas, completar decks competitivos ou descobrir
                                        peças importantes para suas coleções. Foi dessa necessidade
                                        real da comunidade que surgiu a vontade de construir uma
                                        plataforma sólida, organizada e confiável, capaz de reunir
                                        tudo em um só lugar.
                                    </p>

                                    <p>
                                        Nosso propósito é fazer da Bodega Galática uma referência no
                                        mercado secundário de Star Wars: Unlimited, conectando oferta,
                                        demanda, conteúdo e comunidade em um mesmo ecossistema.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <div className="relative h-[280px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 md:h-[340px]">
                                    <Image
                                        src="/sobre/sobre-historia.png"
                                        alt="Nossa história"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* MISSÃO */}
                    <section className="mt-6 grid gap-6 md:grid-cols-3">
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/90 shadow-2xl backdrop-blur">
                            <div className="sunset-line" />
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-white">Nossa missão</h3>
                                <p className="mt-3 text-sm leading-7 text-white/65">
                                    Construir a principal referência em mercado secundário de
                                    Star Wars: Unlimited, oferecendo acesso, confiança e experiência
                                    para jogadores e colecionadores.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/90 shadow-2xl backdrop-blur">
                            <div className="sunset-line" />
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-white">Nossa visão</h3>
                                <p className="mt-3 text-sm leading-7 text-white/65">
                                    Ser mais do que uma loja virtual: ser um hub completo onde
                                    compra, conteúdo, comunidade e tecnologia trabalham juntos
                                    para impulsionar o jogo.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/90 shadow-2xl backdrop-blur">
                            <div className="sunset-line" />
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-white">Nosso compromisso</h3>
                                <p className="mt-3 text-sm leading-7 text-white/65">
                                    Facilitar a vida do jogador, valorizar a coleção do fã e criar
                                    uma marca que caminhe lado a lado com a comunidade.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ECOSSISTEMA BG */}
                    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
                        <div className="sunset-line" />

                        <div className="px-6 py-8 md:px-10 md:py-10">
                            <div className="max-w-3xl">
                                <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                                    A BG é mais do que uma loja
                                </h2>

                                <p className="mt-4 text-sm leading-7 text-white/70 md:text-base">
                                    A Bodega Galática foi pensada como um ecossistema. A loja é uma
                                    parte importante dessa jornada, mas não é a única. Nosso plano
                                    é conectar diferentes frentes para entregar uma experiência mais
                                    completa para a comunidade.
                                </p>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                                    <div className="text-sm font-semibold text-white">
                                        Loja Virtual
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-white/60">
                                        Um lugar para encontrar cartas de Star Wars: Unlimited com
                                        mais praticidade, variedade e confiança.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                                    <div className="text-sm font-semibold text-white">Aplicativo BGON</div>
                                    <p className="mt-3 text-sm leading-6 text-white/60">
                                        O BGON amplia a experiência da comunidade, aproximando
                                        jogadores, conteúdos e interações em um ambiente próprio.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                                    <div className="text-sm font-semibold text-white">Canal no YouTube</div>
                                    <p className="mt-3 text-sm leading-6 text-white/60">
                                        Conteúdo para ajudar a comunidade a acompanhar o jogo, aprender,
                                        se informar e se envolver ainda mais com o universo SWU.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                                    <div className="text-sm font-semibold text-white">Redes Sociais</div>
                                    <p className="mt-3 text-sm leading-6 text-white/60">
                                        Um espaço para novidades, interação com a comunidade e presença
                                        constante junto aos jogadores e colecionadores.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                                       

                    {/* FECHAMENTO */}
                    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
                        <div className="sunset-line" />

                        <div className="px-6 py-10 text-center md:px-10">
                            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                                Estamos construindo algo para a comunidade
                            </h2>

                            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
                                A Bodega Galática está apenas começando. Nossa ambição é crescer
                                junto com a comunidade de Star Wars: Unlimited, oferecendo uma
                                experiência cada vez mais completa para quem joga, coleciona e
                                vive esse universo.
                            </p>

                            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <Link
                                    href="/cartas"
                                    className="rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-rose-200 px-6 py-3 text-sm font-semibold text-[#0B0C10] shadow-[0_12px_32px_rgba(245,158,11,.22)] transition hover:brightness-[1.03]"
                                >
                                    Ver cartas disponíveis
                                </Link>

                                <Link
                                    href="/"
                                    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                                >
                                    Voltar para a home
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