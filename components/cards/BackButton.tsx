"use client";

import { useRouter } from "next/navigation";

export function BackButton({ fallbackHref = "/cartas" }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // Se o usuário entrou direto no detalhe (sem histórico), volta pra listagem
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="rounded-full border border-black/15 bg-white/70 px-4 py-2 text-xs font-semibold text-black/80 hover:bg-white transition-colors"
    >
      Voltar
    </button>
  );
}