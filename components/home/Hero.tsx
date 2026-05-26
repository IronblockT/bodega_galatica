// components/home/Hero.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type HeroSlide = {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  secondaryDescription: string;
  badge: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
  imageSrc: string;
  imageAlt: string;
  theme: "orange" | "blue" | "purple" | "green";
};

const SLIDES: HeroSlide[] = [
  {
    eyebrow: "Singles Star Wars: Unlimited",
    title: "Complete sua coleção com as melhores",
    highlight: "singles",
    description:
      "Encontre cartas avulsas para montar decks, completar coleções e deixar sua pasta ainda mais poderosa.",
    secondaryDescription:
      "Busque por coleção, raridade, tipo de carta e disponibilidade em estoque.",
    badge: "Cartas avulsas em estoque",
    primaryCta: "Ver singles",
    primaryHref: "/cartas",
    secondaryCta: "Ver produtos",
    secondaryHref: "/produtos",
    imageSrc: "/hero/hero-singles.png",
    imageAlt: "Singles de Star Wars Unlimited na Bodega Galáctica",
    theme: "orange",
  },
  {
    eyebrow: "Produtos selados",
    title: "Garanta produtos selados para abrir ou",
    highlight: "colecionar",
    description:
      "Boosters, decks, caixas e produtos fechados para quem joga, coleciona ou quer guardar lançamentos especiais.",
    secondaryDescription:
      "Uma seleção pensada para jogadores e colecionadores de Star Wars: Unlimited.",
    badge: "Selados e lançamentos",
    primaryCta: "Ver selados",
    primaryHref: "/produtos?category=sealed",
    secondaryCta: "Ver singles",
    secondaryHref: "/cartas",
    imageSrc: "/hero/hero-selados.png",
    imageAlt: "Produtos selados de Star Wars Unlimited",
    theme: "blue",
  },
  {
    eyebrow: "Formato Twin Suns",
    title: "Prepare sua mesa para batalhas de",
    highlight: "Twin Suns",
    description:
      "Decks e produtos para o formato multiplayer de Star Wars: Unlimited, perfeito para reunir a comunidade.",
    secondaryDescription:
      "Monte sua estratégia, chame os amigos e transforme a mesa em uma galáxia em disputa.",
    badge: "Multiplayer em destaque",
    primaryCta: "Explorar Twin Suns",
    primaryHref: "/produtos?category=sealed",
    secondaryCta: "Ver singles",
    secondaryHref: "/cartas",
    imageSrc: "/hero/hero-twin-suns.png",
    imageAlt: "Produtos para Twin Suns",
    theme: "purple",
  },
  {
    eyebrow: "Acessórios",
    title: "Proteja, organize e valorize sua",
    highlight: "coleção",
    description:
      "Sleeves, deck boxes, playmats e acessórios para manter suas cartas protegidas e prontas para a próxima partida.",
    secondaryDescription:
      "Itens essenciais para quem leva o hobby a sério e quer jogar com estilo.",
    badge: "Proteção para suas cartas",
    primaryCta: "Ver acessórios",
    primaryHref: "/produtos?category=accessory",
    secondaryCta: "Ver produtos",
    secondaryHref: "/produtos",
    imageSrc: "/hero/hero-acessorios.png",
    imageAlt: "Acessórios para cartas Star Wars Unlimited",
    theme: "green",
  },
];

function themeClasses(theme: HeroSlide["theme"]) {
  if (theme === "blue") {
    return {
      glowOne: "bg-sky-400/30",
      glowTwo: "bg-cyan-300/20",
      accent: "text-sky-300",
      accentGlow: "drop-shadow-[0_0_22px_rgba(125,211,252,0.65)]",
      eyebrow: "border-sky-300/60 bg-sky-400/15 text-sky-100",
      button: "bg-sky-500 hover:bg-sky-400",
      badge: "border-sky-300/50 bg-sky-400/15 text-sky-100",
    };
  }

  if (theme === "purple") {
    return {
      glowOne: "bg-violet-400/30",
      glowTwo: "bg-fuchsia-300/20",
      accent: "text-violet-300",
      accentGlow: "drop-shadow-[0_0_22px_rgba(196,181,253,0.65)]",
      eyebrow: "border-violet-300/60 bg-violet-400/15 text-violet-100",
      button: "bg-violet-500 hover:bg-violet-400",
      badge: "border-violet-300/50 bg-violet-400/15 text-violet-100",
    };
  }

  if (theme === "green") {
    return {
      glowOne: "bg-emerald-400/30",
      glowTwo: "bg-lime-300/20",
      accent: "text-emerald-300",
      accentGlow: "drop-shadow-[0_0_22px_rgba(110,231,183,0.65)]",
      eyebrow: "border-emerald-300/60 bg-emerald-400/15 text-emerald-100",
      button: "bg-emerald-500 hover:bg-emerald-400",
      badge: "border-emerald-300/50 bg-emerald-400/15 text-emerald-100",
    };
  }

  return {
    glowOne: "bg-orange-400/30",
    glowTwo: "bg-amber-300/20",
    accent: "text-orange-300",
    accentGlow: "drop-shadow-[0_0_22px_rgba(253,186,116,0.7)]",
    eyebrow: "border-orange-300/60 bg-orange-400/15 text-orange-100",
    button: "bg-orange-500 hover:bg-orange-400",
    badge: "border-orange-300/50 bg-orange-400/15 text-orange-100",
  };
}

export function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeSlide = SLIDES[activeIndex];

  const classes = useMemo(
    () => themeClasses(activeSlide.theme),
    [activeSlide.theme]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % SLIDES.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-black">
      {/* Background principal */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/hero/hero_bg.png')",
        }}
      />

      {/* Contraste sobre o background */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/22 to-black/8" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,transparent_0%,rgba(0,0,0,0.08)_35%,rgba(0,0,0,0.42)_100%)]" />

      {/* Glows decorativos */}
      <div
        className={`absolute right-12 top-16 h-64 w-64 rounded-full blur-3xl transition-colors duration-700 ${classes.glowOne}`}
      />
      <div
        className={`absolute right-64 bottom-4 h-56 w-56 rounded-full blur-3xl transition-colors duration-700 ${classes.glowTwo}`}
      />
      <div className="absolute -left-20 top-20 h-56 w-56 rounded-full bg-orange-300/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-[500px] max-w-6xl grid-cols-1 items-center gap-8 px-4 py-12 md:grid-cols-[0.9fr_1.1fr] md:py-14">
        {/* TEXTO SEM FRAME */}
        <div className="relative z-10 max-w-2xl">

          <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)] md:text-5xl">
            {activeSlide.title}{" "}
            <span
              className={`${classes.accent} ${classes.accentGlow} inline-block -rotate-1`}
            >
              {activeSlide.highlight}
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/90 drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]">
            {activeSlide.description}
          </p>

          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/90 drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            {activeSlide.secondaryDescription}
          </p>


          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={activeSlide.primaryHref}
              className={`rounded-full px-6 py-3 text-xs font-black uppercase tracking-wide text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 ${classes.button}`}
            >
              {activeSlide.primaryCta}
            </a>

            <a
              href={activeSlide.secondaryHref}
              className="rounded-full border border-white/25 bg-white/95 px-6 py-3 text-xs font-black uppercase tracking-wide text-black shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              {activeSlide.secondaryCta}
            </a>
          </div>

          <div className="mt-6 flex items-center gap-2">
            {SLIDES.map((slide, index) => (
              <button
                key={slide.imageSrc}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ir para slide ${index + 1}`}
                className={`h-2.5 rounded-full transition-all ${index === activeIndex
                    ? "w-10 bg-white shadow-[0_0_18px_rgba(255,255,255,0.75)]"
                    : "w-2.5 bg-white/35 hover:bg-white/60"
                  }`}
              />
            ))}
          </div>
        </div>

        {/* IMAGEM DO SLIDE */}
        <div className="relative flex min-h-[360px] items-center justify-center">
          <div className="absolute left-1/2 top-1/2 h-[260px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/35 blur-3xl" />

          <div
            className={`absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-700 ${classes.glowOne}`}
          />

          <img
            key={activeSlide.imageSrc}
            src={activeSlide.imageSrc}
            alt={activeSlide.imageAlt}
            className="relative z-10 mx-auto max-h-[420px] w-full max-w-[620px] object-contain drop-shadow-[0_32px_70px_rgba(0,0,0,0.75)] transition-all duration-500"
          />
        </div>
      </div>
    </section>
  );
}