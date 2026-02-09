'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type NavItem = {
  label: string;
  sections: Array<{
    title?: string;
    links: Array<{ label: string; href: string }>;
  }>;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Star Wars Unlimited',
    sections: [
      {
        title: 'Cartas',
        links: [
          { label: 'Todas as Cartas', href: '/cartas' },
          { label: 'Líderes', href: '/cartas?tipo=lider' },
          { label: 'Unidades', href: '/cartas?tipo=unidade' },
          { label: 'Eventos', href: '/cartas?tipo=evento' },
          { label: 'Upgrades', href: '/cartas?tipo=upgrade' },
        ],
      },
      {
        title: 'Coleções',
        links: [
          { label: 'Spark of Rebellion', href: '/cartas?set=sor' },
          { label: 'Shadows of the Galaxy', href: '/cartas?set=shd' },
        ],
      },
      {
        title: 'Atalhos',
        links: [
          { label: 'Mais Vendidas', href: '/cartas?sort=mais_vendidas' },
          { label: 'Novidades', href: '/cartas?sort=novidades' },
        ],
      },
    ],
  },
  {
    label: 'Acessórios',
    sections: [
      {
        links: [
          { label: 'Sleeves', href: '/acessorios?s=sleeves' },
          { label: 'Deck Boxes', href: '/acessorios?s=deck-boxes' },
          { label: 'Playmats', href: '/acessorios?s=playmats' },
          { label: 'Binders', href: '/acessorios?s=binders' },
          { label: 'Marcadores', href: '/acessorios?s=marcadores' },
        ],
      },
    ],
  },
  {
    label: 'Comunidade',
    sections: [
      {
        links: [
          { label: 'Sobre a Bodega Galática', href: '/sobre' },
          { label: 'Guias', href: '/guias' },
          { label: 'Decklists', href: '/decklists' },
          { label: 'Eventos', href: '/eventos' },
          { label: 'BGON', href: '/comunidade' },
        ],
      },
    ],
  },
];

function Dropdown({
  item,
  open,
  onToggle,
  onClose,
}: {
  item: NavItem;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="
          inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm
          border border-white/10
          text-white/80 hover:text-white
          hover:bg-white/5 hover:border-white/20
          transition
        "
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="tracking-wide">{item.label}</span>
        <span className={`text-white/55 transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          className="
            absolute left-0 top-full z-50 mt-3 w-[620px]
            rounded-2xl border border-white/10
            bg-[#0B0C10]/95 backdrop-blur
            shadow-2xl
          "
          role="menu"
        >
          <div className="sunset-line" />

          <div className="p-5">
            <div className="grid grid-cols-3 gap-5">
              {item.sections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  {section.title && (
                    <div
                      className="
      text-xs font-semibold uppercase tracking-[0.18em]
      text-amber-300
      drop-shadow-[0_1px_4px_rgba(245,158,11,.35)]
    "
                    >
                      {section.title}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    {section.links.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={onClose} // fecha ao navegar
                        className="
                          rounded-xl px-3 py-2 text-sm
                          text-white/80 hover:text-white
                          hover:bg-white/10 transition
                        "
                        role="menuitem"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const router = useRouter();

  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const items = useMemo(() => NAV_ITEMS, []);

  const navRef = useRef<HTMLDivElement>(null);

  const { isLoggedIn, user, signOut, profile } = useAuth();

  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const avatarKey = profile?.avatar_key ?? null;  

  async function handleLogout() {
    await signOut();
    setAccountOpen(false);
    router.push('/');
  }

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (navRef.current && !navRef.current.contains(target)) {
        setOpenLabel(null);
      }

      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fecha com ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenLabel(null);
        setAccountOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const avatarText =
    (user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full">
      {/* HEADER PRINCIPAL */}
      <div className="bg-[#07080A]">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-24 bg-gradient-to-b from-amber-500/10 via-rose-500/5 to-transparent" />

        <div className="mx-auto flex h-24 max-w-6xl items-center gap-6 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 shrink-0">
            <div className="relative h-24 w-40 flex items-center justify-center">
              <Image
                src="/logo-bodega-galatica.png"
                alt="Bodega Galática"
                fill
                priority
                className="
                  object-contain
                  scale-[1.58]
                  translate-y-[8px]
                  translate-x-[-4%]
                  drop-shadow-[0_22px_55px_rgba(0,0,0,.65)]
                "
              />
            </div>

            <span className="whitespace-nowrap text-[22px] font-semibold tracking-tight text-white">
              BG Exchange
            </span>
          </Link>

          {/* Busca (centro) */}
          <div className="mx-6 hidden w-full max-w-xl md:block">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                ⌕
              </span>

              <input
                type="search"
                placeholder="Buscar na Bodega Galática"
                className={[
                  'w-full rounded-2xl border border-white/10 bg-white/5',
                  'pl-10 pr-24 py-3 text-sm text-white placeholder:text-white/40',
                  'outline-none focus:border-white/25',
                  'shadow-[0_12px_40px_rgba(0,0,0,.35)]',
                ].join(' ')}
              />

              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/55">
                  Ctrl K
                </span>
              </div>
            </div>
          </div>

          {/* Ações (direita) */}
          {/* Ações (direita) */}
          <nav className="ml-auto flex items-center gap-2">
            {/* Comprar */}
            <Link
              href={isLoggedIn ? '/cartas' : '/entrar'}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 hover:border-white/25 hover:text-white transition"
            >
              Comprar
            </Link>

            {/* Vender */}
            <Link
              href="/vender"
              className={[
                'rounded-full px-4 py-2 text-sm font-semibold',
                'text-[#0B0C10]',
                'bg-gradient-to-r from-amber-300 via-amber-200 to-rose-200',
                'shadow-[0_12px_32px_rgba(245,158,11,.22)]',
                'hover:brightness-[1.03] transition',
              ].join(' ')}
            >
              Vender
            </Link>

            {/* Entrar (ou Avatar) — sempre por último */}
            {!isLoggedIn ? (
              <Link
                href="/entrar"
                className="rounded-full px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                Entrar
              </Link>
            ) : (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="inline-flex items-center gap-2 px-2 py-2 hover:opacity-90 transition"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-white/80">
                    {avatarKey ? (
                      <img
                        src={`/avatars/${avatarKey}.png`}
                        alt="Avatar"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-white/10 text-white flex items-center justify-center text-sm font-semibold">
                        {user?.email?.[0]?.toUpperCase() ?? 'U'}
                      </span>
                    )}
                  </span>

                  <span className={`text-white/60 transition-transform ${accountOpen ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </button>

                {accountOpen && (
                  <div
                    className="
            absolute right-0 top-full z-50 mt-3 w-56
            rounded-2xl border border-white/10
            bg-[#0B0C10]/95 backdrop-blur
            shadow-2xl
          "
                    role="menu"
                  >
                    <div className="sunset-line" />

                    <div className="p-2">
                      <Link
                        href="/minha-conta"
                        onClick={() => setAccountOpen(false)}
                        className="
                block rounded-xl px-3 py-2 text-sm
                text-white/85 hover:text-white
                hover:bg-white/10 transition
              "
                        role="menuitem"
                      >
                        Minha conta
                      </Link>

                      <Link
                        href="/configuracoes"
                        onClick={() => setAccountOpen(false)}
                        className="
                block rounded-xl px-3 py-2 text-sm
                text-white/85 hover:text-white
                hover:bg-white/10 transition
              "
                        role="menuitem"
                      >
                        Configurações
                      </Link>

                      <div className="my-2 h-px bg-white/10" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="
                w-full text-left rounded-xl px-3 py-2 text-sm
                text-rose-200 hover:text-white
                hover:bg-white/10 transition
              "
                        role="menuitem"
                      >
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="sunset-line" />
      </div>

      {/* SUBHEADER (click-based) */}
      <div className="bg-[#0B0C10]" ref={navRef}>
        <div className="mx-auto flex h-12 max-w-6xl items-center px-4">
          {items.map((item) => (
            <Dropdown
              key={item.label}
              item={item}
              open={openLabel === item.label}
              onToggle={() => setOpenLabel(openLabel === item.label ? null : item.label)}
              onClose={() => setOpenLabel(null)}
            />
          ))}

          {/* CTA vender no subheader */}
          <div className="ml-auto flex w-[260px] justify-end">
            <Link
              href="/vender"
              className={[
                'rounded-full px-6 py-2 text-sm font-semibold',
                'text-[#0B0C10]',
                'bg-gradient-to-r from-orange-400 to-orange-500',
                'hover:from-orange-500 hover:to-orange-600',
                'transition-colors',
              ].join(' ')}
            >
              Venda suas Cartas!
            </Link>
          </div>

          {/* Mobile: link de busca */}
          <div className="md:hidden ml-auto">
            <Link
              href="/cartas"
              className="rounded-full px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              Buscar
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
