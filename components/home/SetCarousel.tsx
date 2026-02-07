'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

type SetItem = {
    code: string;
    name: string;
    logoSrc: string;
    href: string;
};

const SETS: SetItem[] = [
    { code: 'SOR', name: 'Spark of Rebellion', logoSrc: '/swu/sets/sor.png', href: '/cartas?set=sor' },
    { code: 'SHD', name: 'Shadows of the Galaxy', logoSrc: '/swu/sets/shd.png', href: '/cartas?set=shd' },
    { code: 'TWI', name: 'Twilight of the Republic', logoSrc: '/swu/sets/twi.png', href: '/cartas?set=twi' },
    { code: 'JTL', name: 'Jump to Lightspeed', logoSrc: '/swu/sets/jtl.png', href: '/cartas?set=jtl' },
    { code: 'LOF', name: 'Legends of the Force', logoSrc: '/swu/sets/lof.png', href: '/cartas?set=lof' },
    { code: 'SEC', name: 'Secrets of Power', logoSrc: '/swu/sets/sec.png', href: '/cartas?set=sec' },
];

export function SetCarousel() {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: 'left' | 'right') => {
        if (!scrollRef.current) return;

        const amount = 320;
        scrollRef.current.scrollBy({
            left: dir === 'left' ? -amount : amount,
            behavior: 'smooth',
        });
    };

    return (
        <section className="relative bg-[#07080A]">
            {/* background espacial sutil */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                    backgroundImage: `
            radial-gradient(circle at 15% 30%, rgba(255,255,255,.25) 0 1px, transparent 2px),
            radial-gradient(circle at 60% 20%, rgba(255,255,255,.2) 0 1px, transparent 2px),
            radial-gradient(circle at 80% 60%, rgba(255,255,255,.15) 0 1px, transparent 2px)
          `,
                    backgroundSize: '520px 520px',
                }}
            />

            <div className="sunset-line opacity-60" />

            <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-12">
                {/* SETA ESQUERDA */}
                <button
                    onClick={() => scroll('left')}
                    className="
            absolute left-2 top-1/2 -translate-y-1/2 z-10
            hidden md:flex
            h-10 w-10 items-center justify-center
            rounded-full
            bg-black/60 text-white
            backdrop-blur
            ring-1 ring-white/15
            hover:bg-black/80
            transition
          "
                    aria-label="Rolar para esquerda"
                >
                    ‹
                </button>

                {/* SETA DIREITA */}
                <button
                    onClick={() => scroll('right')}
                    className="
            absolute right-2 top-1/2 -translate-y-1/2 z-10
            hidden md:flex
            h-10 w-10 items-center justify-center
            rounded-full
            bg-black/60 text-white
            backdrop-blur
            ring-1 ring-white/15
            hover:bg-black/80
            transition
          "
                    aria-label="Rolar para direita"
                >
                    ›
                </button>

                {/* CAROUSEL */}
                <div
                    ref={scrollRef}
                    className="
    flex gap-8 overflow-x-auto py-2 px-10 md:px-6
    scroll-smooth
    [-ms-overflow-style:none]
    [scrollbar-width:none]
    [&::-webkit-scrollbar]:hidden
    snap-x snap-mandatory
  "
                >
                    {SETS.map((s) => (
                        <Link
                            key={s.code}
                            href={s.href}
                            className="snap-start shrink-0 w-[210px] md:w-[240px] group"
                        >
                            {/* Logo */}
                            <div className="relative h-20 w-full">
                                <Image
                                    src={s.logoSrc}
                                    alt={`Logo do set ${s.name}`}
                                    fill
                                    className="
                    object-contain
                    drop-shadow-[0_18px_45px_rgba(0,0,0,.65)]
                    group-hover:drop-shadow-[0_26px_70px_rgba(0,0,0,.85)]
                    transition
                  "
                                />
                            </div>

                            {/* Texto */}
                            <div className="mt-3 flex items-center justify-between">
                                <div className="text-sm font-semibold text-white">
                                    {s.name}
                                </div>
                                <span className="text-xs font-semibold text-orange-400">
                                    {s.code}
                                </span>
                            </div>

                            {/* underline hover */}
                            <div className="mt-2 h-[2px] w-0 bg-gradient-to-r from-orange-400 to-rose-300 transition-all duration-300 group-hover:w-full" />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
