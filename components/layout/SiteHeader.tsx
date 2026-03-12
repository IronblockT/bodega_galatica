'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/hooks/useAuth';
import { useCart } from '@/components/cart/CartProvider';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type NavItem = {
  label: string;
  sections: Array<{
    title?: string;
    links: Array<{ label: string; href: string }>;
  }>;
};

type CartItemDetail = {
  sku_key: string;
  card_uid: string | null;
  name: string;
  subtitle: string | null;
  image_url: string | null;
  finish: string | null;
  condition: string | null;
  promo_type: string | null;
  price_brl: number | string | null;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Star Wars Unlimited',
    sections: [
      {
        title: 'Cartas',
        links: [
          { label: 'Todas as Cartas', href: '/cartas' },
          { label: 'Líderes', href: '/cartas?type=Leader&page=1' },
          { label: 'Unidades', href: '/cartas?type=Unit&page=1' },
          { label: 'Eventos', href: '/cartas?type=Event&page=1' },
          { label: 'Upgrades', href: '/cartas?type=Upgrade&page=1' },
        ],
      },
      {
        title: 'Coleções',
        links: [
          { label: 'Spark of Rebellion', href: '/cartas?set=SOR&page=1' },
          { label: 'Shadows of the Galaxy', href: '/cartas?set=SHD&page=1' },
          { label: 'Twilight of the Republic', href: '/cartas?set=TWI&page=1' },
          { label: 'Jump to Lightspeed', href: '/cartas?set=JTL&page=1' },
          { label: 'Legends of the Force', href: '/cartas?set=LOF&page=1' },
          { label: 'Secrets of Power', href: '/cartas?set=SEC&page=1' },
          { label: 'A Lawless Time', href: '/cartas?set=LAW&page=1' },
        ],
      },
      {
        title: 'Atalhos',
        links: [
          { label: 'Mais Vendidas', href: '/cartas' },
          { label: 'Novidades', href: '/cartas' },
        ],
      },
    ],
  },
  {
    label: 'Acessórios',
    sections: [
      {
        links: [
          { label: 'Sleeves', href: '/acessorios' },
          { label: 'Deck Boxes', href: '/acessorios' },
          { label: 'Playmats', href: '/acessorios' },
          { label: 'Binders', href: '/acessorios' },
          { label: 'Marcadores', href: '/acessorios' },
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
                    {section.links.map((l, linkIdx) => (
                      <Link
                        key={`${l.href}-${l.label}-${linkIdx}`}
                        href={l.href}
                        onClick={onClose}
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

function CartIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 7h14l-2 8H8L7 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 7 6.5 5H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.5 20a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
        fill="currentColor"
      />
      <path
        d="M17.5 20a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SiteHeader() {
  const router = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const items = useMemo(() => NAV_ITEMS, []);

  const navRef = useRef<HTMLDivElement>(null);

  const { isLoggedIn, user, signOut, profile } = useAuth();

  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // ✅ carrinho
  const { count, items: cartItems, reserving, lastReserveError, expiresAt, reserveNow, clear } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  const [cartDetails, setCartDetails] = useState<CartItemDetail[]>([]);
  const [cartDetailsLoading, setCartDetailsLoading] = useState(false);

  const avatarKey = profile?.avatar_key ?? null;

  async function handleLogout() {
    await signOut();
    setAccountOpen(false);
    setCartOpen(false);
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

      if (cartRef.current && !cartRef.current.contains(target)) {
        setCartOpen(false);
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
        setCartOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const avatarText = (user?.email?.[0] ?? 'U').toUpperCase();

  function formatPrice(value: number | string | null | undefined) {
    const n = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(n)) return null;
    return Number(n).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCartDetails() {
      if (!cartItems.length) {
        setCartDetails([]);
        return;
      }

      try {
        setCartDetailsLoading(true);

        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sku_keys: cartItems.map((it) => it.sku_key),
          }),
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? "Falha ao carregar itens do carrinho");
        }

        if (!cancelled) {
          setCartDetails(Array.isArray(json.items) ? json.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setCartDetails([]);
          console.error("[cart-details]", err);
        }
      } finally {
        if (!cancelled) {
          setCartDetailsLoading(false);
        }
      }
    }

    loadCartDetails();

    return () => {
      cancelled = true;
    };
  }, [cartItems]);

  const cartDetailBySku = useMemo(() => {
    return new Map(cartDetails.map((item) => [item.sku_key, item]));
  }, [cartDetails]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, it) => {
      const detail = cartDetailBySku.get(it.sku_key);
      const price =
        typeof detail?.price_brl === "string"
          ? Number(detail.price_brl)
          : Number(detail?.price_brl ?? 0);

      if (!Number.isFinite(price)) return sum;
      return sum + price * it.qty;
    }, 0);
  }, [cartItems, cartDetailBySku]);

  useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    setSearchQuery(currentQ);
  }, [searchParams]);

  function handleSearchSubmit(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();

    const term = searchQuery.trim();

    const params = new URLSearchParams();

    if (term) {
      params.set("q", term);
    }

    params.set("page", "1");

    router.push(`/cartas?${params.toString()}`);
    setOpenLabel(null);
    setAccountOpen(false);
    setCartOpen(false);
  }

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
            <form onSubmit={handleSearchSubmit} className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                ⌕
              </span>

              <input
                type="search"
                placeholder="Buscar cartas na Bodega Galática"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={[
                  'w-full rounded-2xl border border-white/10 bg-white/5',
                  'pl-10 pr-28 py-3 text-sm text-white placeholder:text-white/40',
                  'outline-none focus:border-white/25',
                  'shadow-[0_12px_40px_rgba(0,0,0,.35)]',
                ].join(' ')}
              />

              <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/75 hover:bg-white/10 hover:text-white transition"
                >
                  Buscar
                </button>
              </div>
            </form>
          </div>

          {/* Ações (direita) */}
          <nav className="ml-auto flex items-center gap-2">
            {/* Comprar */}
            <Link
              href={isLoggedIn ? '/cartas' : '/entrar'}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 hover:border-white/25 hover:text-white transition"
            >
              Comprar
            </Link>

            {/* ✅ Carrinho (produção) */}
            <div className="relative" ref={cartRef}>
              <button
                type="button"
                onClick={() => setCartOpen((v) => !v)}
                className="
                  relative inline-flex items-center gap-2 rounded-full
                  border border-white/15 bg-white/5
                  px-3 py-2 text-sm text-white/85
                  hover:bg-white/10 hover:border-white/25 hover:text-white transition
                "
                aria-haspopup="dialog"
                aria-expanded={cartOpen}
              >
                <CartIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Carrinho</span>

                {/* badge */}
                {count > 0 ? (
                  <span
                    className="
                      absolute -top-1 -right-1
                      h-5 min-w-[20px] px-1
                      rounded-full
                      bg-orange-500
                      text-[#0B0C10]
                      text-[11px] font-bold
                      flex items-center justify-center
                      shadow-[0_10px_25px_rgba(249,115,22,.25)]
                    "
                    aria-label={`${count} itens no carrinho`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </button>

              {cartOpen && (
                <div
                  className="
                    absolute right-0 top-full z-50 mt-3 w-[360px]
                    rounded-2xl border border-white/10
                    bg-[#0B0C10]/95 backdrop-blur
                    shadow-2xl
                  "
                  role="dialog"
                  aria-label="Carrinho"
                >
                  <div className="sunset-line" />

                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white/85">Seu carrinho</div>
                      <button
                        type="button"
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
                        onClick={() => setCartOpen(false)}
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="mt-3 text-xs text-white/55">
                      {count > 0 ? (
                        <>
                          <div>{count} item(ns)</div>

                          <div className="mt-1">
                            Total:{' '}
                            <span className="text-white/85 font-semibold">
                              {formatPrice(cartTotal) ?? '—'}
                            </span>
                          </div>

                          <div className="mt-1">
                            Reserva:{' '}
                            <span className="text-white/75">
                              {expiresAt ? new Date(expiresAt).toLocaleString('pt-BR') : '—'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div>Carrinho vazio.</div>
                      )}
                    </div>

                    {lastReserveError ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-rose-200">
                        {lastReserveError}
                      </div>
                    ) : null}

                    {/* itens (versão mínima: sku + qty) */}
                    {cartItems.length > 0 ? (
                      <div className="mt-4 max-h-[280px] overflow-auto pr-1 space-y-2">
                        {cartDetailsLoading ? (
                          <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-3 text-xs text-white/55">
                            Carregando itens do carrinho...
                          </div>
                        ) : (
                          <>
                            {cartItems.slice(0, 8).map((it) => {
                              const detail = cartDetailBySku.get(it.sku_key);

                              return (
                                <div
                                  key={it.sku_key}
                                  className="rounded-xl border border-white/10 bg-black/60 px-3 py-2"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-white/90 truncate">
                                        {detail?.name ?? "Carta"}
                                      </div>

                                      {detail?.subtitle ? (
                                        <div className="mt-1 text-[11px] text-white/65 truncate">
                                          {detail.subtitle}
                                        </div>
                                      ) : null}

                                      <div className="mt-1 text-[11px] text-white/55">
                                        {[detail?.finish, detail?.condition].filter(Boolean).join(" • ") || "—"}
                                      </div>

                                      {detail?.price_brl != null ? (
                                        <div className="mt-1 text-[11px] text-orange-300 font-medium">
                                          {formatPrice(detail.price_brl)}
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="text-xs text-white/80 shrink-0">x{it.qty}</div>
                                  </div>
                                </div>
                              );
                            })}

                            {cartItems.length > 8 ? (
                              <div className="text-[11px] text-white/45">
                                +{cartItems.length - 8} item(ns)…
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}

                    {/* ações */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        href="/carrinho"
                        onClick={() => setCartOpen(false)}
                        className="
                          rounded-full border border-white/15 bg-white/5
                          px-4 py-2 text-xs font-semibold text-white/85
                          hover:bg-white/10 hover:text-white transition text-center
                        "
                      >
                        Ver carrinho
                      </Link>

                      <button
                        type="button"
                        disabled={!isLoggedIn || cartItems.length === 0 || reserving}
                        onClick={async () => {
                          await reserveNow();
                          setCartOpen(false);
                          router.push('/checkout');
                        }}
                        className="
    rounded-full bg-orange-500
    px-4 py-2 text-xs font-semibold text-[#0B0C10]
    hover:bg-orange-600 transition-colors
    disabled:opacity-40
  "
                      >
                        {reserving ? 'Preparando...' : 'Finalizar compra'}
                      </button>

                      <button
                        type="button"
                        disabled={cartItems.length === 0}
                        onClick={() => clear()}
                        className="
                          col-span-2 rounded-full border border-white/15 bg-white/5
                          px-4 py-2 text-xs font-semibold text-white/80
                          hover:bg-white/10 hover:text-white transition
                          disabled:opacity-40
                        "
                      >
                        Limpar carrinho
                      </button>
                    </div>

                    {!isLoggedIn ? (
                      <div className="mt-3 text-[11px] text-white/45">
                        Faça <Link href="/entrar" className="text-orange-300 hover:underline" onClick={() => setCartOpen(false)}>login</Link>{' '}
                        para reservar e finalizar compras.
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

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
                        {avatarText}
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