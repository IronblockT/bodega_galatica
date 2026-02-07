import Image from 'next/image';
import Link from 'next/link';

type CargoProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageSrc: string;
  href: string;
};

const CARGO_PRODUCTS: CargoProduct[] = [
  {
    id: 'bulk',
    name: 'Bulk Galáctico',
    description: 'Lote com dezenas de cartas para iniciar sua coleção.',
    price: 29.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/produtos/bulk-galactico',
  },
  {
    id: 'chaos',
    name: 'Chaos Booster',
    description: 'Booster montado com cartas variadas de vários sets.',
    price: 19.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/produtos/chaos-booster',
  },
  {
    id: 'draft',
    name: 'Bodega Galática Draft Pack',
    description: 'Booster balanceado para drafts e jogo casual.',
    price: 24.9,
    imageSrc: '/swu/cards/placeholder.png',
    href: '/produtos/bodega-draft',
  },
];

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CargoSection() {
  return (
    <section className="relative bg-[#0B0C10] overflow-hidden">
      {/* fundo espacial discreto */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,.25) 0 1px, transparent 2px),
            radial-gradient(circle at 70% 60%, rgba(255,255,255,.18) 0 1px, transparent 2px)
          `,
          backgroundSize: '520px 520px',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
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

        {/* PRODUTOS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CARGO_PRODUCTS.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="
                group rounded-2xl bg-white/5 backdrop-blur
                ring-1 ring-white/10
                hover:bg-white/10 transition
                overflow-hidden
              "
            >
              {/* imagem */}
              <div className="relative aspect-[3/4] w-full bg-black/20">
                <Image
                  src={p.imageSrc}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-[1.03] transition-transform"
                />
              </div>

              {/* texto */}
              <div className="p-4">
                <div className="text-sm font-semibold text-white">
                  {p.name}
                </div>

                <div className="mt-1 text-xs text-white/60">
                  {p.description}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-orange-400">
                    {formatBRL(p.price)}
                  </div>
                  <span className="text-xs text-white/60 group-hover:text-white transition">
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
