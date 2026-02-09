import { SiteHeader } from '@/components/layout/SiteHeader';
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
      
      {/* HERO — TATOOINE */}
      <section className="relative bg-sand">
        {/* céu / horizonte */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF3E0] via-[#FDE7C7] to-[#F7E7CF]" />

        {/* “sol” Tatooine */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl" />
        <div className="absolute -top-10 -right-40 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />

        {/* calor do deserto */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#F5E6CF] to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* TEXTO */}
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              Os maiores negociantes de{' '}
              <span className="text-orange-500">Star Wars: Unlimited</span>{' '}
              da galáxia.
            </h1>

            <p className="mt-5 text-lg text-black/65">
              Compre, venda e negocie cartas com segurança, transparência
              e escala galáctica.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="/cartas"
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-95"
              >
                Comprar Cartas
              </a>

              <a
                href="/vender"
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-black/5"
              >
                Vender Cartas
              </a>
            </div>
          </div>

          {/* VISUAL — ARTE FLUTUANDO */}
          <div className="relative flex items-center justify-center">
            {/* sombra suave no “chão” */}
            <div className="absolute h-[300px] w-[520px] rounded-full bg-black/20 blur-3xl translate-y-20" />

            {/* glow quente atrás */}
            <div className="absolute h-64 w-64 rounded-full bg-orange-400/20 blur-3xl -translate-x-16 translate-y-10" />

            <Image
              src="/swu/secrets-of-power-hero.png"
              alt="Star Wars: Unlimited — Secrets of Power"
              width={700}
              height={520}
              priority
              className="relative w-full max-w-[620px] drop-shadow-[0_30px_70px_rgba(0,0,0,.45)]"
            />
          </div>
        </div>
      </section>
      <SetCarousel />
      <Bounties />
      <CargoSection />
      <MerchSection />
      <BackToTop />
      <SiteFooter />
    </main>
  );
}
