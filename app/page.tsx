import { ReserveNowButton } from '@/components/home/ReserveNowButton';
import Image from 'next/image';
import { SetCarousel } from '@/components/home/SetCarousel';
import { Bounties } from '@/components/home/Bounties';
import { CargoSection } from '@/components/home/CargoSection';
import { MerchSection } from '@/components/home/MerchSection';
import { BackToTop } from '@/components/layout/BackToTop';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function Home() {
  return (
    <main className="min-h-screen bg-sand">
      {/* HERO — PRÉ-VENDA TWIN SUNS */}
      <section className="relative overflow-hidden bg-sand">
        {/* céu / fundo */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF3E0] via-[#FDE7C7] to-[#F7E7CF]" />

        {/* glow / sóis */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl" />
        <div className="absolute -top-10 -right-40 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-yellow-200/20 blur-3xl" />

        {/* calor do deserto */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F5E6CF] to-transparent" />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-24 md:grid-cols-2">
          {/* TEXTO */}
          <div>
            <div className="inline-flex items-center rounded-full border border-orange-300/60 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700 shadow-sm backdrop-blur-sm">
              Pré-venda exclusiva
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-black md:text-5xl">
              Reserve agora os novos decks de{' '}
              <span className="text-orange-500">Twin Suns</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-black/70">
              Garanta seu lugar no novo formato de Star Wars: Unlimited com a
              pré-venda dos decks Twin Suns na Bodega Galática.
            </p>

            <p className="mt-3 max-w-xl text-base text-black/60">
              Faça sua reserva agora e entre na fila de prioridade para o lançamento.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <ReserveNowButton />

              <a
                href="/cartas"
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-black/5"
              >
                Explorar a Loja
              </a>
            </div>
          </div>

          {/* VISUAL — IMAGEM DO PRODUTO */}
          <div className="relative flex items-center justify-center">
            {/* sombra suave */}
            <div className="absolute h-[300px] w-[520px] translate-y-20 rounded-full bg-black/20 blur-3xl" />

            {/* glow atrás da arte */}
            <div className="absolute -translate-x-16 translate-y-10 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />

            <Image
              src="/swu/twin-suns-placeholder.png"
              alt="Pré-venda dos decks Twin Suns"
              width={700}
              height={520}
              priority
              className="relative w-full max-w-[620px] drop-shadow-[0_30px_70px_rgba(0,0,0,.45)]"
            />
          </div>
        </div>
      </section>

      <SetCarousel />

      <section id="bounties" className="scroll-mt-32">
        <Bounties />
      </section>

      <CargoSection />
      <MerchSection />
      <BackToTop />
      <SiteFooter />
    </main>
  );
}