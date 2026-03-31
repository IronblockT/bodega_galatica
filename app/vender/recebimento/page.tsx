import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";
import { RecebimentoClient } from "./recebimento-client";

export default function VenderRecebimentoPage() {
  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
          <Suspense
            fallback={
              <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-8 text-white shadow-2xl">
                Carregando etapa de recebimento...
              </div>
            }
          >
            <RecebimentoClient />
          </Suspense>
        </div>

        <BackToTop />
      </main>

      <SiteFooter />
    </>
  );
}