import Image from 'next/image';

export function MerchSection() {
  return (
    <section className="relative overflow-hidden bg-sand">
      {/* glow quente Tatooine */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 md:grid-cols-2">
        {/* IMAGEM */}
        <div className="flex justify-center md:justify-start">
          <div className="relative w-full max-w-[560px]">
            <div className="relative aspect-[16/9] w-full">
              <Image
                src="/swu/cards/placeholder_merch.png"
                alt="Placeholder de merch da Bodega Galática"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* TEXTO */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-black">
            Insígnias da <span className="text-orange-500">Galáxia</span>
          </h2>

          <p className="mt-4 text-black/65">
            Mais do que cartas, a Bodega Galática é uma identidade.
            Aqui você encontra produtos oficiais para quem vive o jogo,
            frequenta drafts, eventos e carrega a galáxia consigo.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-black/60">
            <li>• Produtos exclusivos da Bodega Galática</li>
            <li>• Ideal para eventos, drafts e jogo casual</li>
            <li>• Qualidade premium, design autoral</li>
          </ul>
        </div>
      </div>
    </section>
  );
}