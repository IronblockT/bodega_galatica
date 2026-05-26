// app/page.tsx
import { Hero } from '@/components/home/Hero';
import { SetCarousel } from '@/components/home/SetCarousel';
import { Bounties } from '@/components/home/Bounties';
import { CargoSection } from '@/components/home/CargoSection';
import { MerchSection } from '@/components/home/MerchSection';
import { BackToTop } from '@/components/layout/BackToTop';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function Home() {
  return (
    <main className="min-h-screen bg-sand">
      <Hero />

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