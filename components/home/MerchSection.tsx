import Image from 'next/image';
import Link from 'next/link';

type MerchItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageSrc: string;
  href: string;
};

const MERCH: MerchItem[] = [
  {
    id: 'tee',
    name: 'Camiseta Bodega Galática',
    description: 'Algodão premium com estampa exclusiva.',
    price: 89.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/merch/camiseta-bodega',
  },
  {
    id: 'playmat',
    name: 'Playmat Oficial',
    description: 'Base antiderrapante com arte galáctica.',
    price: 159.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/merch/playmat-bodega',
  },
  {
    id: 'sleeves',
    name: 'Sleeves Premium',
    description: 'Proteção e estilo para suas cartas.',
    price: 39.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/merch/sleeves-bodega',
  },
];

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function MerchSection() {
  return (
    <section className="relative bg-sand overflow-hidden">
      {/* glow quente Tatooine */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
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

          <Link
            href="/merch"
            className="inline-flex mt-8 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-black/5 transition"
          >
            Ver toda a coleção →
          </Link>
        </div>

        {/* PRODUTOS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MERCH.map((m) => (
            <Link
              key={m.id}
              href={m.href}
              className="
                group rounded-2xl bg-white/80 backdrop-blur
                ring-1 ring-black/5 shadow-premium
                hover:shadow-[0_18px_50px_rgba(0,0,0,.14)]
                transition overflow-hidden
              "
            >
              <div className="relative aspect-[3/4] w-full bg-gradient-to-b from-black/5 to-black/0">
                <Image
                  src={m.imageSrc}
                  alt={m.name}
                  fill
                  className="object-cover group-hover:scale-[1.03] transition-transform"
                />
              </div>

              <div className="p-4">
                <div className="text-sm font-semibold text-black">
                  {m.name}
                </div>

                <div className="mt-1 text-xs text-black/60">
                  {m.description}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-orange-600">
                    {formatBRL(m.price)}
                  </div>
                  <span className="text-xs text-black/50 group-hover:text-black/70 transition">
                    Ver →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
