"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BountyCard = {
  id: string;
  card_uid: string;
  sku_key: string;
  name: string;
  setCode: string;
  rarity: string;
  price: number;
  previousPrice: number;
  spikeBrl: number;
  spikePct: number;
  finish: string;
  promoType: string;
  condition: string;
  imageSrc: string;
  href: string;
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Bounties() {
  const [items, setItems] = useState<BountyCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadTrending() {
      try {
        const res = await fetch("/api/cards/trending", { cache: "no-store" });
        const json = await res.json();
        console.log("[Bounties API response]", json);

        if (!active) return;

        if (json?.ok && Array.isArray(json.items)) {
          setItems(json.items);
        } else {
          setItems([]);
        }
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTrending();

    return () => {
      active = false;
    };
  }, []);

  console.log("[Bounties items state]", items);

  return (
    <section className="relative overflow-hidden bg-sand">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              Bounties <span className="text-orange-600">— Em alta</span>
            </h2>
            <p className="mt-2 text-sm text-black/60">
              Cartas com maior valorização recente na galáxia.
            </p>
          </div>

          <Link
            href="/cartas?sort=em_alta"
            className="hidden md:inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black/5 transition"
          >
            Ver todas →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`loading-${i}`}
                className="rounded-2xl bg-white/70 ring-1 ring-black/5 shadow-premium overflow-hidden animate-pulse"
              >
                <div className="aspect-[3/4] w-full bg-black/5" />
                <div className="p-3">
                  <div className="h-4 rounded bg-black/10" />
                  <div className="mt-2 h-4 w-24 rounded bg-black/10" />
                </div>
              </div>
            ))
            : items.map((c) => {
              console.log("[Bounties render item]", {
                id: c.id,
                name: c.name,
                imageSrc: c.imageSrc,
              });

              return (
                <Link
                  key={c.id}
                  href={c.href}
                  className="
                    group rounded-2xl bg-white/80 backdrop-blur
                    ring-1 ring-black/5 shadow-premium
                    hover:shadow-[0_18px_50px_rgba(0,0,0,.14)]
                    transition
                  "
                >
                  <div className="relative w-full bg-[#0B0C10] flex items-center justify-center py-4 border-4 border-red-500">
                    <img
                      src={c.imageSrc}
                      alt={c.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-[220px] w-auto object-contain transition-transform group-hover:scale-[1.02] border-4 border-green-500"
                      onLoad={() => {
                        console.log("[Bounties image loaded]", c.imageSrc);
                      }}
                      onError={() => {
                        console.log("[Bounties image error]", c.imageSrc);
                      }}
                    />

                    <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                      <span className="rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold text-white">
                        {c.setCode}
                      </span>
                      <span className="rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-black">
                        {c.rarity}
                      </span>
                    </div>

                    <div className="absolute right-3 bottom-3 z-10 rounded-full bg-orange-500/90 px-2 py-1 text-[10px] font-semibold text-white shadow">
                      +{Number(c.spikePct || 0).toFixed(0)}%
                    </div>
                  </div>

                  <div className="flex min-h-[92px] flex-col p-3">
                    <div className="line-clamp-2 text-sm font-semibold text-black">
                      {c.name}
                    </div>

                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-orange-600">
                        {formatBRL(c.price)}
                      </div>
                      <span className="text-xs text-black/50 group-hover:text-black/70 transition">
                        Ver →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>

        {!loading && items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/60">
            Nenhuma carta em alta encontrada no momento.
          </div>
        ) : null}

        <div className="mt-8 md:hidden">
          <Link
            href="/cartas?sort=em_alta"
            className="inline-flex w-full justify-center rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-black/5 transition"
          >
            Ver todas as cartas em alta →
          </Link>
        </div>
      </div>
    </section>
  );
}