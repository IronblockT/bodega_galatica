import Image from 'next/image';
import Link from 'next/link';

type BountyCard = {
  id: string;
  name: string;
  setCode: string;
  rarity: string;
  price: number;
  imageSrc: string; // coloque suas imagens em /public/swu/cards/...
  href: string;
};

const BOUNTIES: BountyCard[] = [
  {
    id: 'b1',
    name: 'Bounty 1 (exemplo)',
    setCode: 'SEC',
    rarity: 'Raro',
    price: 49.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/cartas/bounty-1',
  },
  {
    id: 'b2',
    name: 'Bounty 2 (exemplo)',
    setCode: 'SEC',
    rarity: 'Lendário',
    price: 129.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/cartas/bounty-2',
  },
  {
    id: 'b3',
    name: 'Bounty 3 (exemplo)',
    setCode: 'SHD',
    rarity: 'Raro',
    price: 39.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/cartas/bounty-3',
  },
  {
    id: 'b4',
    name: 'Bounty 4 (exemplo)',
    setCode: 'SOR',
    rarity: 'Incomum',
    price: 19.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/cartas/bounty-4',
  },
  {
    id: 'b5',
    name: 'Bounty 5 (exemplo)',
    setCode: 'TWI',
    rarity: 'Raro',
    price: 59.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/cartas/bounty-5',
  },
  {
    id: 'b6',
    name: 'Bounty 6 (exemplo)',
    setCode: 'JTL',
    rarity: 'Lendário',
    price: 149.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/cartas/bounty-6',
  },
];

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Bounties() {
  return (
    <section className="relative bg-sand">
      {/* leve “sol” Tatooine no fundo */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              Bounties <span className="text-orange-600">— Mais procurados</span>
            </h2>
            <p className="mt-2 text-sm text-black/60">
              As singles mais buscadas da galáxia — prontas para compra imediata.
            </p>
          </div>

          <Link
            href="/cartas?sort=mais_procuradas"
            className="hidden md:inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black/5 transition"
          >
            Ver todas →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {BOUNTIES.map((c) => (
            <Link
              key={c.id}
              href={c.href}
              className="
                group rounded-2xl bg-white/80 backdrop-blur
                ring-1 ring-black/5 shadow-premium
                hover:shadow-[0_18px_50px_rgba(0,0,0,.14)]
                transition overflow-hidden
              "
            >
              {/* imagem */}
              <div className="relative aspect-[3/4] w-full bg-gradient-to-b from-black/5 to-black/0">
                <Image
                  src={c.imageSrc}
                  alt={c.name}
                  fill
                  className="object-cover group-hover:scale-[1.02] transition-transform"
                />

                {/* badge set/raridade */}
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span className="rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold text-white">
                    {c.setCode}
                  </span>
                  <span className="rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-black">
                    {c.rarity}
                  </span>
                </div>
              </div>

              {/* texto */}
              <div className="p-3">
                <div className="line-clamp-2 text-sm font-semibold text-black">
                  {c.name}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-orange-600">
                    {formatBRL(c.price)}
                  </div>
                  <span className="text-xs text-black/50 group-hover:text-black/70 transition">
                    Ver →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA mobile */}
        <div className="mt-8 md:hidden">
          <Link
            href="/cartas?sort=mais_procuradas"
            className="inline-flex w-full justify-center rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-black/5 transition"
          >
            Ver todas as mais procuradas →
          </Link>
        </div>
      </div>
    </section>
  );
}
