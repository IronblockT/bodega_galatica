import Image from 'next/image';

export function CargoSection() {
  return (
    <section className="relative bg-[#0B0C10]">
      {/* fundo espacial discreto */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,.25) 0 1px, transparent 2px),
            radial-gradient(circle at 70% 60%, rgba(255,255,255,.18) 0 1px, transparent 2px)
          `,
          backgroundSize: '520px 520px',
        }}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 md:grid-cols-2">
        {/* TEXTO */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Cargo da <span className="text-orange-400">Orla Exterior</span>
          </h2>

          <p className="mt-4 text-white/70">
            Nem todo jogador começa com uma coleção completa — e está tudo bem.
            Aqui você encontra produtos montados pela Bodega Galática usando nosso
            próprio estoque, ideais para quem está começando, joga casualmente
            ou quer experimentar o jogo sem investir pesado.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-white/65">
            <li>• Perfeito para novos jogadores</li>
            <li>• Ótimo para drafts entre amigos</li>
            <li>• Produtos exclusivos da Bodega Galática</li>
            <li>• Custo acessível, diversão garantida</li>
          </ul>
        </div>

        {/* IMAGEM */}
        {/* IMAGEM */}
        <div className="flex justify-center md:justify-end">
          <div className="relative w-full max-w-[560px]">
            <div className="relative aspect-[16/9] w-full">
              <Image
                src="/swu/cards/placeholder_cargo.png"
                alt="Placeholder de produtos da Bodega Galática"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}