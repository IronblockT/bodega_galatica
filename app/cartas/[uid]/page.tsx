// app/cartas/[uid]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackButton } from "@/components/cards/BackButton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CardUI = {
  card_uid: string;
  expansion_code: string;
  title: string;
  subtitle: string | null;

  card_number: number | null;
  card_count: number | null;
  artist: string | null;

  card_type_label: string | null;
  rarity_label: string | null;

  aspects_labels: string[];
  traits_labels: string[];
  keywords_labels: string[];

  cost: number | null;
  power: number | null;
  hp: number | null;

  rules_text: string | null;
  deploy_box: string | null;
  epic_action: string | null;
  reminder_text: string | null;

  is_unique: boolean | null;

  image_front_url: string | null;
  image_back_url: string | null;
};

function ptType(type?: string | null) {
  const map: Record<string, string> = {
    Base: "Base",
    Leader: "Líder",
    Unit: "Unidade",
    Upgrade: "Upgrade",
    Event: "Evento",
    Token: "Token",
  };
  return type ? map[type] ?? type : "—";
}

function pillClass() {
  return "rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs text-white/70";
}

function aspectIcon(aspect: string) {
  const m: Record<string, string> = {
    Aggression: "/aspects/Aggression.png",
    Vigilance: "/aspects/Vigilance.png",
    Command: "/aspects/Command.png",
    Cunning: "/aspects/Cunning.png",
    Heroism: "/aspects/Heroism.png",
    Villainy: "/aspects/Villainy.png",
  };
  return m[aspect] ?? null;
}

async function getCard(uid: string): Promise<CardUI | null> {
  const { data, error } = await supabase
    .from("swu_cards_ui")
    .select(
      `
      card_uid,
      expansion_code,
      title,
      subtitle,
      card_number,
      card_count,
      artist,
      card_type_label,
      rarity_label,
      aspects_labels,
      traits_labels,
      keywords_labels,
      cost,
      power,
      hp,
      rules_text,
      deploy_box,
      epic_action,
      reminder_text,
      is_unique,
      image_front_url,
      image_back_url
      `
    )
    .eq("card_uid", uid)
    .maybeSingle();

  if (error) return null;
  return (data as any) ?? null;
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;

  const card = await getCard(uid);
  if (!card) return notFound();

  const displayName = card.subtitle ? `${card.title}, ${card.subtitle}` : card.title;

  const numberText =
    card.card_number && card.card_count
      ? `#${card.card_number}/${card.card_count}`
      : card.card_number
        ? `#${card.card_number}`
        : null;

  const hasBack = Boolean(card.image_back_url);

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
        {/* Top bar */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs text-black/50">Carta</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-black">
              {displayName}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-black/70">
              <span>{ptType(card.card_type_label)}</span>
              <span className="text-black/30">•</span>
              <span className="font-semibold">{card.expansion_code}</span>
              {numberText ? (
                <>
                  <span className="text-black/30">•</span>
                  <span>{numberText}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2">
            <BackButton fallbackHref="/cartas" />
          </div>
        </div>

        {/* Conteúdo em “envelope dark” */}
        <div className="rounded-2xl border border-white/10 bg-[#0B0C10] p-6 md:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Coluna imagens */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white/80">Imagens</div>

                  {/* Toggle simples via anchors (sem estado JS) */}
                  <div className="flex gap-2 text-xs">
                    <a
                      href="#front"
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/10"
                    >
                      Frente
                    </a>
                    <a
                      href="#back"
                      className={[
                        "rounded-full border px-3 py-1",
                        hasBack
                          ? "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                          : "border-white/10 bg-white/0 text-white/30 cursor-not-allowed",
                      ].join(" ")}
                      aria-disabled={!hasBack}
                    >
                      Verso
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  {/* Frente */}
                  <div id="front" className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <div className="text-xs text-white/50 mb-2">Frente</div>
                    <div className="flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                      {card.image_front_url ? (
                        <img
                          src={card.image_front_url}
                          alt={`${displayName} (frente)`}
                          className="max-h-[520px] w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="p-8 text-sm text-white/60">Sem imagem.</div>
                      )}
                    </div>
                  </div>

                  {/* Verso */}
                  <div id="back" className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <div className="text-xs text-white/50 mb-2">Verso</div>
                    <div className="flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                      {card.image_back_url ? (
                        <img
                          src={card.image_back_url}
                          alt={`${displayName} (verso)`}
                          className="max-h-[520px] w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="p-8 text-sm text-white/60">
                          Esta carta não possui verso cadastrado.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna detalhes */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badges principais */}
              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
                <div className="text-sm font-semibold text-white/80 mb-3">Detalhes</div>

                <div className="flex flex-wrap gap-2">
                  <span className={pillClass()}>{ptType(card.card_type_label)}</span>
                  <span className={pillClass()}>{card.expansion_code}</span>
                  {card.rarity_label ? <span className={pillClass()}>{card.rarity_label}</span> : null}
                  {numberText ? <span className={pillClass()}>{numberText}</span> : null}
                  {card.is_unique ? <span className={pillClass()}>Única</span> : null}
                  {card.artist ? <span className={pillClass()}>Arte: {card.artist}</span> : null}
                </div>

                {/* Aspectos com ícones */}
                {card.aspects_labels?.length ? (
                  <div className="mt-4">
                    <div className="text-xs text-white/55 mb-2">Aspectos</div>
                    <div className="flex flex-wrap gap-2">
                      {card.aspects_labels.map((a) => {
                        const icon = aspectIcon(a);
                        return (
                          <span
                            key={a}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70"
                            title={a}
                          >
                            {icon ? (
                              <img src={icon} alt={a} className="h-4 w-4 object-contain" />
                            ) : null}
                            {a}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Stats */}
              {card.cost !== null || card.power !== null || card.hp !== null ? (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
                  <div className="text-sm font-semibold text-white/80 mb-3">Atributos</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                      <div className="text-xs text-white/50">Custo</div>
                      <div className="mt-1 text-lg font-semibold text-white">{card.cost ?? "—"}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                      <div className="text-xs text-white/50">Power</div>
                      <div className="mt-1 text-lg font-semibold text-white">{card.power ?? "—"}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                      <div className="text-xs text-white/50">HP</div>
                      <div className="mt-1 text-lg font-semibold text-white">{card.hp ?? "—"}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Texto da carta */}
              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
                <div className="text-sm font-semibold text-white/80 mb-3">Texto</div>

                {card.rules_text ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                    {card.rules_text}
                  </div>
                ) : (
                  <div className="text-sm text-white/60">Sem texto cadastrado.</div>
                )}

                {card.deploy_box || card.epic_action || card.reminder_text ? (
                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {card.deploy_box ? (
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                        <div className="text-xs text-white/50 mb-1">Deploy</div>
                        <div className="whitespace-pre-wrap text-sm text-white/70">{card.deploy_box}</div>
                      </div>
                    ) : null}

                    {card.epic_action ? (
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                        <div className="text-xs text-white/50 mb-1">Epic Action</div>
                        <div className="whitespace-pre-wrap text-sm text-white/70">{card.epic_action}</div>
                      </div>
                    ) : null}

                    {card.reminder_text ? (
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3 md:col-span-2">
                        <div className="text-xs text-white/50 mb-1">Reminder</div>
                        <div className="whitespace-pre-wrap text-sm text-white/70">
                          {card.reminder_text}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Traits / Keywords */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
                  <div className="text-sm font-semibold text-white/80 mb-3">Traits</div>
                  {card.traits_labels?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {card.traits_labels.map((t) => (
                        <span key={t} className={pillClass()}>
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-white/60">—</div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
                  <div className="text-sm font-semibold text-white/80 mb-3">Keywords</div>
                  {card.keywords_labels?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {card.keywords_labels.map((k) => (
                        <span key={k} className={pillClass()}>
                          {k}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-white/60">—</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}