"use client";

import { useMemo, useState } from "react";

type KarabastCardRef = {
  id: string | null;
  count?: number | null;
  internalName: string | null;
  cost?: number | null;
};

type KarabastLiveGame = {
  id: string;
  isPrivate: boolean;
  player1Leader: KarabastCardRef | null;
  player1Base: KarabastCardRef | null;
  player2Leader: KarabastCardRef | null;
  player2Base: KarabastCardRef | null;
  format: string | null;
  cardPool: string | null;
  gamesToWinMode: string | null;
};

type KarabastLeader = {
  id: string;
  name: string;
  subtitle: string | null;
};

type CatalogCard = {
  card_uid: string;
  title: string;
  subtitle: string | null;
  expansion_code: string | null;
  card_number: number | null;
  card_type: string | null;
  image_front_url: string | null;
};

type MetaStatsCardUsage = {
  cardName: string;
  cardUid?: string;
  displayName?: string;
  subtitle?: string | null;
  expansionCode?: string | null;
  cardType?: string | null;
  imageUrl?: string | null;
  searchHref?: string;
  raw3?: number;
  pct3?: number;
  raw2?: number;
  pct2?: number;
  raw1?: number;
  pct1?: number;
};

type MetaStatsDecklistCard = {
  count: number | string;
  section?: string;
  cardName?: string;
  card?: {
    name?: string;
    aspect?: string;
    cost?: number | null;
    type?: string;
    imageUrl?: string | null;
  } | null;
};

type MetaStatsDecklist = {
  id?: number;
  guid: string;
  standing?: number | null;
  leaderName?: string;
  baseName?: string;
  tournament?: {
    name?: string;
    startDate?: string;
  } | null;
  player?: {
    name?: string;
  } | null;
  cards?: MetaStatsDecklistCard[];
};

type CompetitiveLeaderProfile = {
  leaderKarabastId: string;
  leaderName: string;
  totalDecks: number;
  totalMetaDecks: number;
  bases: Array<{
    baseKarabastId: string;
    baseName: string;
    totalDecks: number;
  }>;
  mainboardGroups: {
    Core: MetaStatsCardUsage[];
    Popular: MetaStatsCardUsage[];
    Flex: MetaStatsCardUsage[];
  };
  recentDecklists: MetaStatsDecklist[];
};

type CardPoolFilter = "todos" | "current";
type LeaderSetFilter = "todos" | "ASH" | "LAW" | "SEC" | "LOF" | "JTL";

type LiveLeader = {
  rank: number;
  karabastId: string;
  cardUid: string;
  name: string;
  subtitle: string;
  displayName: string;
  expansionCode: string;
  imageUrl: string;
  appearances: number;
  metaSharePct: number;
  currentAppearances: number;
  nextSetAppearances: number;
};

type LiveBase = {
  rank: number;
  karabastId: string;
  cardUid: string;
  name: string;
  subtitle: string;
  displayName: string;
  expansionCode: string;
  imageUrl: string;
  appearances: number;
  metaSharePct: number;
};

type LivePair = {
  rank: number;
  key: string;
  leader: LiveLeader;
  base: LiveBase;
  appearances: number;
  metaSharePct: number;
};

const ACCENTS = [
  {
    stroke: "#f97316",
    soft: "bg-orange-500/15",
    border: "border-orange-400/45",
    text: "text-orange-200",
    glow: "shadow-[0_0_36px_rgba(249,115,22,0.32)]",
  },
  {
    stroke: "#a855f7",
    soft: "bg-violet-500/15",
    border: "border-violet-400/45",
    text: "text-violet-200",
    glow: "shadow-[0_0_36px_rgba(168,85,247,0.28)]",
  },
  {
    stroke: "#f59e0b",
    soft: "bg-amber-500/15",
    border: "border-amber-400/45",
    text: "text-amber-200",
    glow: "shadow-[0_0_36px_rgba(245,158,11,0.28)]",
  },
  {
    stroke: "#38bdf8",
    soft: "bg-sky-500/15",
    border: "border-sky-400/45",
    text: "text-sky-200",
    glow: "shadow-[0_0_36px_rgba(56,189,248,0.24)]",
  },
];

const LEADER_ART_CROP = {
  sourceWidth: 1000,
  x: 60,
  y: 57,
  width: 395,
  height: 527,
};

const PREMIER_LEADER_SETS: LeaderSetFilter[] = ["todos", "ASH", "LAW", "SEC", "LOF", "JTL"];

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPct(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatDate(value?: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatCardPool(cardPool: string | null) {
  if (cardPool === "current") return "Meta atual";
  return cardPool ?? "-";
}

function cardDisplayName(card?: CatalogCard | null) {
  if (!card) return "-";
  return card.subtitle ? `${card.title} - ${card.subtitle}` : card.title;
}

function LeaderPortrait({
  leader,
  className = "",
}: {
  leader: Pick<LiveLeader, "imageUrl" | "displayName" | "name">;
  className?: string;
}) {
  const initials = leader.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className={`relative shrink-0 overflow-hidden border border-white/15 bg-white/10 ${className}`}>
      {leader.imageUrl ? (
        <img
          src={leader.imageUrl}
          alt={leader.displayName}
          className="absolute h-auto max-w-none transition duration-500 group-hover:brightness-110"
          style={{
            width: `${(LEADER_ART_CROP.sourceWidth / LEADER_ART_CROP.width) * 100}%`,
            left: `${-(LEADER_ART_CROP.x / LEADER_ART_CROP.width) * 100}%`,
            top: `${-(LEADER_ART_CROP.y / LEADER_ART_CROP.height) * 100}%`,
          }}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
          {initials || "SW"}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-white/10" />
      <div className="pointer-events-none absolute inset-2 rounded-[inherit] border border-white/10" />
    </div>
  );
}

function CardImage({
  imageUrl,
  name,
  className = "",
}: {
  imageUrl: string;
  name: string;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden border border-white/15 bg-black/35 ${className}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-black text-white/70">
          {name}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/10" />
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone = 0,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: number;
}) {
  const accent = ACCENTS[tone % ACCENTS.length];

  return (
    <div className={`group relative overflow-hidden rounded-3xl border ${accent.border} bg-[#0B0C10]/78 p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${accent.glow}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.12),transparent_32%)] opacity-80" />
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">{label}</p>
        <p className="mt-2 line-clamp-1 text-3xl font-black tracking-tight text-white">{value}</p>
        <p className="mt-1 text-sm text-white/65">{detail}</p>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? "from-yellow-300 to-orange-500"
      : rank === 2
        ? "from-violet-300 to-violet-700"
        : rank === 3
          ? "from-orange-300 to-orange-700"
          : "from-slate-400 to-slate-700";

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-sm font-black text-black shadow-[0_10px_24px_rgba(0,0,0,0.4)]`}>
      {rank}
    </div>
  );
}

function LeadersBoard({
  leaders,
  selectedLeaderId,
  onSelectLeader,
  leaderSet,
  onSelectLeaderSet,
}: {
  leaders: LiveLeader[];
  selectedLeaderId: string;
  onSelectLeader: (leaderId: string) => void;
  leaderSet: LeaderSetFilter;
  onSelectLeaderSet: (set: LeaderSetFilter) => void;
}) {
  const topAppearances = Math.max(leaders[0]?.appearances ?? 1, 1);

  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-8">
      <div className="overflow-hidden rounded-[2rem] border border-orange-400/30 bg-[#0B0C10]/78 shadow-[0_22px_80px_rgba(0,0,0,0.46)] backdrop-blur-xl">
        <div className="sunset-line" />

        <div className="flex flex-col gap-4 border-b border-white/10 p-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Karabast ao vivo</p>
            <h2 className="mt-1 text-2xl font-black text-white">Líderes mais usados agora</h2>
          </div>
          <div className="flex flex-col gap-3 xl:items-end">
            <p className="max-w-xl text-sm font-semibold leading-6 text-white/55">
              Ranking por aparições em jogos Premier em andamento. Não inclui vencedor, derrota ou histórico fechado.
            </p>
            <div className="flex flex-wrap gap-2">
              {PREMIER_LEADER_SETS.map((set) => (
                <button
                  key={set}
                  type="button"
                  onClick={() => onSelectLeaderSet(set)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${leaderSet === set
                      ? "border-orange-300 bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,0.28)]"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white"
                    }`}
                >
                  {set === "todos" ? "Todos" : set}
                </button>
              ))}
            </div>
          </div>
        </div>

        {leaders.length > 0 ? (
          <div className="grid gap-4 p-5 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {leaders.slice(0, 3).map((leader, index) => {
                  const accent = ACCENTS[index % ACCENTS.length];

                  return (
                    <button
                      key={leader.karabastId}
                      type="button"
                      onClick={() => onSelectLeader(leader.karabastId)}
                      className={`group relative overflow-hidden rounded-3xl border ${selectedLeaderId === leader.karabastId ? "border-orange-200" : accent.border} bg-white/[0.035] p-4 text-left transition duration-300 hover:-translate-y-1 ${accent.glow}`}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.18),transparent_38%)]" />
                      <div className="relative flex items-center justify-between gap-2">
                        <span className={`rounded-full border ${accent.border} ${accent.soft} px-3 py-1 text-xs font-black uppercase tracking-wide ${accent.text}`}>
                          Top {leader.rank}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-black text-white/70">
                          {leader.expansionCode}
                        </span>
                      </div>

                      <LeaderPortrait leader={leader} className="relative mx-auto mt-4 aspect-[395/527] h-32 rounded-[1.2rem] shadow-2xl" />

                      <div className="relative mt-3 text-center">
                        <p className="truncate text-base font-black text-white">{leader.name}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-white/50">{leader.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">Pressão do meta</p>
                  <p className="text-xs font-semibold text-white/40">Top 3 por aparições</p>
                </div>

                <div className="space-y-3">
                  {leaders.slice(0, 3).map((leader, index) => {
                    const accent = ACCENTS[index % ACCENTS.length];
                    const width = Math.max(30, (leader.appearances / topAppearances) * 100);

                    return (
                      <button
                        key={`${leader.karabastId}-bar`}
                        type="button"
                        onClick={() => onSelectLeader(leader.karabastId)}
                        className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition hover:bg-white/[0.055] ${selectedLeaderId === leader.karabastId
                            ? "border-orange-300 bg-orange-500/10"
                            : "border-white/10 bg-white/[0.03]"
                          }`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 rounded-2xl ${accent.soft} transition-all duration-500`}
                          style={{ width: `${width}%` }}
                        />
                        <div className="relative flex items-center gap-3">
                          <RankBadge rank={leader.rank} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-black text-white">{leader.name}</p>
                            <p className="truncate text-xs text-white/45">{leader.subtitle}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-black ${accent.text}`}>{formatPct(leader.metaSharePct)}%</p>
                            <p className="text-xs text-white/45">{leader.appearances} aparições</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {leaders.slice(0, 8).map((leader) => (
                <button
                  key={leader.karabastId}
                  type="button"
                  onClick={() => onSelectLeader(leader.karabastId)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition hover:bg-white/[0.055] ${selectedLeaderId === leader.karabastId
                      ? "border-orange-300 bg-orange-500/10"
                      : "border-white/10 bg-white/[0.035]"
                    }`}
                >
                  <RankBadge rank={leader.rank} />
                  <LeaderPortrait leader={leader} className="aspect-[395/527] h-14 rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">{leader.name}</p>
                    <p className="truncate text-xs text-white/45">{leader.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">{formatPct(leader.metaSharePct)}%</p>
                    <p className="text-xs text-white/45">{leader.appearances}x</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <p className="text-sm font-semibold leading-6 text-white/60">
                Nenhum líder deste set apareceu no snapshot Premier atual do Karabast.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BasesAndPairs({
  bases,
  pairs,
}: {
  bases: LiveBase[];
  pairs: LivePair[];
}) {
  return (
    <section className="relative mx-auto grid max-w-7xl gap-5 px-4 pb-8 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-[2rem] border border-orange-400/30 bg-[#0B0C10]/72 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Bases</p>
          <h2 className="mt-1 text-2xl font-black text-white">Bases mais usadas</h2>
        </div>

        <div className="space-y-3">
          {bases.slice(0, 8).map((base) => (
            <div key={base.karabastId} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
              <RankBadge rank={base.rank} />
              <CardImage imageUrl={base.imageUrl} name={base.displayName} className="h-14 w-20 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-white">{base.name}</p>
                <p className="text-xs text-white/45">{base.expansionCode}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-white">{formatPct(base.metaSharePct)}%</p>
                <p className="text-xs text-white/45">{base.appearances}x</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-orange-400/30 bg-[#0B0C10]/72 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Combinações</p>
          <h2 className="mt-1 text-2xl font-black text-white">Pares líder + base</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {pairs.slice(0, 8).map((pair) => (
            <div key={pair.key} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-1 hover:bg-white/[0.055]">
              <div className="flex items-center justify-between">
                <RankBadge rank={pair.rank} />
                <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-black text-white/60">
                  {formatPct(pair.metaSharePct)}%
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <LeaderPortrait leader={pair.leader} className="aspect-[395/527] h-16 rounded-2xl" />
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{pair.leader.name}</p>
                  <p className="truncate text-xs text-white/45">{pair.base.name}</p>
                  <p className="mt-1 text-xs font-bold text-orange-200">{pair.appearances} jogos em andamento</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function usageScore(card: MetaStatsCardUsage) {
  return toNumber(card.pct3) + toNumber(card.pct2) + toNumber(card.pct1);
}

function readableCardText(value?: string | null) {
  if (!value) return "";

  const cleaned = String(value).trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("{") || cleaned.startsWith("[") || cleaned.includes('"data"') || cleaned.includes('"attributes"')) return "";
  if (cleaned === "[object Object]") return "";

  return cleaned;
}

function decklistCardName(card: MetaStatsDecklistCard) {
  return readableCardText(card.cardName) || readableCardText(card.card?.name) || "Carta";
}

function decklistCardSection(card: MetaStatsDecklistCard) {
  return readableCardText(card.section) || "Mainboard";
}

function decklistCardBuyHref(card: MetaStatsDecklistCard) {
  return `/cartas?search=${encodeURIComponent(decklistCardName(card))}`;
}

function decklistCardSellHref(card: MetaStatsDecklistCard) {
  return `/vender?q=${encodeURIComponent(decklistCardName(card))}`;
}

function groupDecklistCards(cards: MetaStatsDecklistCard[]) {
  const groups = new Map<string, MetaStatsDecklistCard[]>();

  for (const card of cards) {
    const section = decklistCardSection(card);
    const current = groups.get(section) ?? [];
    current.push(card);
    groups.set(section, current);
  }

  const sectionWeight = (section: string) => {
    const normalized = section.toLowerCase();
    if (normalized.includes("leader")) return 0;
    if (normalized.includes("base")) return 1;
    if (normalized.includes("ground")) return 2;
    if (normalized.includes("space")) return 3;
    if (normalized.includes("event")) return 4;
    if (normalized.includes("upgrade")) return 5;
    if (normalized.includes("side")) return 9;
    return 6;
  };

  return Array.from(groups.entries()).sort((a, b) => sectionWeight(a[0]) - sectionWeight(b[0]));
}

function DecklistModal({
  decklist,
  onClose,
}: {
  decklist: MetaStatsDecklist | null;
  onClose: () => void;
}) {
  if (!decklist) return null;

  const groupedCards = groupDecklistCards(decklist.cards ?? []);
  const totalCards = (decklist.cards ?? []).reduce((sum, card) => sum + toNumber(card.count), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-orange-300/35 bg-[#070A0F] shadow-[0_28px_120px_rgba(0,0,0,0.75)]">
        <div className="sunset-line" />
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Decklist Bodega</p>
            <h3 className="mt-1 text-2xl font-black leading-tight text-white">
              {decklist.leaderName ?? "Deck competitivo"}
            </h3>
            <p className="mt-1 text-sm font-semibold text-white/55">
              {decklist.baseName ?? "Base nao informada"} · {decklist.player?.name ?? "Jogador"} · #{decklist.standing ?? "-"}
            </p>
            <p className="mt-1 text-xs font-semibold text-white/40">
              {decklist.tournament?.name ?? "Torneio"} {formatDate(decklist.tournament?.startDate) ? `· ${formatDate(decklist.tournament?.startDate)}` : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/60">
              {totalCards} cartas
            </span>
            <a
              href={`https://swumetastats.com/decklists/${decklist.guid}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/60 transition hover:border-orange-300/45 hover:text-white"
            >
              Fonte
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/70 transition hover:border-orange-300/45 hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {groupedCards.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {groupedCards.map(([section, cards]) => (
                <section key={section} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">{section}</p>
                    <span className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-black text-white/45">
                      {cards.reduce((sum, card) => sum + toNumber(card.count), 0)} cartas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {cards.map((card, index) => {
                      const name = decklistCardName(card);
                      const cardType = readableCardText(card.card?.type);
                      const aspect = readableCardText(card.card?.aspect);

                      return (
                        <div key={`${section}-${name}-${index}`} className="group/card flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-orange-300/45 hover:bg-white/[0.055]">
                          <a href={decklistCardBuyHref(card)} className="shrink-0 transition duration-200 group-hover/card:scale-110">
                            <CardImage imageUrl={card.card?.imageUrl ?? ""} name={name} className="h-16 w-11 rounded-xl" />
                          </a>
                          <div className="min-w-0 flex-1">
                            <a href={decklistCardBuyHref(card)} className="line-clamp-1 text-sm font-black text-white transition hover:text-orange-200">
                              {name}
                            </a>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-orange-300/35 bg-orange-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-orange-100">
                                x{toNumber(card.count)}
                              </span>
                              {cardType ? (
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase text-white/55">
                                  {cardType}
                                </span>
                              ) : null}
                              {aspect ? (
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase text-white/55">
                                  {aspect}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <a href={decklistCardBuyHref(card)} className="rounded-xl border border-orange-200/35 bg-orange-500 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-orange-400">
                              Comprar
                            </a>
                            <a href={decklistCardSellHref(card)} className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white/70 transition hover:border-orange-300/45 hover:text-white">
                              Vender
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm font-semibold leading-6 text-white/65">
                Esta decklist veio sem a lista completa de cartas na API. Use o link Fonte para abrir o registro original.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompetitiveCardRow({
  card,
  tone,
}: {
  card: MetaStatsCardUsage;
  tone: number;
}) {
  const accent = ACCENTS[tone % ACCENTS.length];
  const score = usageScore(card);
  const buyHref = card.searchHref ?? `/cartas?search=${encodeURIComponent(card.cardName)}`;
  const sellSearchName = card.cardName || card.displayName || "";
  const sellHref = `/vender?q=${encodeURIComponent(sellSearchName)}`;
  const subtitle = readableCardText(card.subtitle);
  const cardType = readableCardText(card.cardType);

  return (
    <div className="group/card relative rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-orange-300/45 hover:bg-white/[0.055]">
      <div className="flex gap-3">
        <a href={buyHref} className="relative z-10 shrink-0 transition duration-200 group-hover/card:z-30 group-hover/card:scale-125">
          <CardImage imageUrl={card.imageUrl ?? ""} name={card.displayName ?? card.cardName} className="h-16 w-11 rounded-xl shadow-[0_10px_24px_rgba(0,0,0,0.35)]" />
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <a href={buyHref} className="line-clamp-1 text-sm font-black text-white transition hover:text-orange-200">
                {card.displayName ?? card.cardName}
              </a>
              {subtitle ? <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-white/45">{subtitle}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {card.expansionCode ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase text-white/55">
                    {card.expansionCode}
                  </span>
                ) : null}
                {cardType ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase text-white/55">
                    {cardType}
                  </span>
                ) : null}
                <span className={`rounded-full border ${accent.border} ${accent.soft} px-2 py-0.5 text-[10px] font-black uppercase ${accent.text}`}>
                  Uso {formatPct(score)}%
                </span>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <a href={buyHref} className="rounded-xl border border-orange-200/35 bg-orange-500 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-orange-400">
                Comprar
              </a>
              <a href={sellHref} className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white/70 transition hover:border-orange-300/45 hover:text-white">
                Vender
              </a>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${Math.min(100, Math.max(8, score))}%` }} />
            </div>
            <p className="text-[11px] font-semibold text-white/45">
              3x {formatPct(toNumber(card.pct3))}% · 2x {formatPct(toNumber(card.pct2))}% · 1x {formatPct(toNumber(card.pct1))}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageGroup({
  title,
  cards,
  tone,
}: {
  title: string;
  cards: MetaStatsCardUsage[];
  tone: number;
}) {
  const accent = ACCENTS[tone % ACCENTS.length];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className={`text-xs font-black uppercase tracking-[0.16em] ${accent.text}`}>{title}</p>
        <span className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-black text-white/45">
          {cards.length} cartas
        </span>
      </div>

      <div className="space-y-3">
        {cards.slice(0, 12).map((card) => (
          <CompetitiveCardRow key={`${title}-${card.cardName}`} card={card} tone={tone} />
        ))}
      </div>
    </div>
  );
}

function CompetitivePanel({
  profile,
  onOpenDecklist,
}: {
  profile?: CompetitiveLeaderProfile;
  onOpenDecklist: (decklist: MetaStatsDecklist) => void;
}) {
  if (!profile) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-semibold leading-6 text-white/65">
          Ainda não encontramos leitura competitiva pública suficiente para este líder. A página continua mostrando o sinal ao vivo do Karabast.
        </p>
      </div>
    );
  }

  const groups = [
    { title: "Core", cards: profile.mainboardGroups.Core, tone: 0 },
    { title: "Popular", cards: profile.mainboardGroups.Popular, tone: 1 },
    { title: "Flex", cards: profile.mainboardGroups.Flex, tone: 2 },
  ].filter((group) => group.cards.length);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-black uppercase tracking-wide text-white/40">Decks analisados</p>
          <p className="mt-1 text-2xl font-black text-orange-200">{profile.totalDecks}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-black uppercase tracking-wide text-white/40">Bases encontradas</p>
          <p className="mt-1 truncate text-lg font-black text-white">{profile.bases.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-black uppercase tracking-wide text-white/40">Fonte</p>
          <p className="mt-1 text-lg font-black text-white">SWU Meta Stats</p>
        </div>
      </div>

      {profile.bases.length ? (
        <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Bases competitivas agregadas</p>
            <span className="text-xs font-bold text-white/40">Sem exigir paridade com o Karabast</span>
          </div>
          <div className="space-y-2">
            {profile.bases.slice(0, 6).map((base, index) => {
              const topDecks = Math.max(profile.bases[0]?.totalDecks ?? 1, 1);
              const width = Math.max(10, (base.totalDecks / topDecks) * 100);

              return (
                <div key={`${base.baseKarabastId}-${base.baseName}`} className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-white/65">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-white">{base.baseName}</p>
                        <p className="shrink-0 text-xs font-black text-orange-200">{base.totalDecks} decks</p>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {groups.map((group) => (
          <UsageGroup key={group.title} title={group.title} cards={group.cards} tone={group.tone} />
        ))}
      </div>

      {profile.recentDecklists.length ? (
        <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Decklists recentes</p>
            <a
              href={`https://swumetastats.com/decklists?leaderName=${encodeURIComponent(profile.leaderName)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-black uppercase tracking-wide text-orange-200 hover:text-orange-100"
            >
              Ver arquivo
            </a>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {profile.recentDecklists.slice(0, 3).map((deck) => (
              <button
                key={deck.guid}
                type="button"
                onClick={() => onOpenDecklist(deck)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-orange-300/45 hover:bg-white/[0.055]"
              >
                <p className="truncate text-sm font-black text-white">{deck.player?.name ?? "Jogador"}</p>
                <p className="mt-1 truncate text-xs text-white/45">{deck.tournament?.name ?? "Torneio"}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-black text-white/55">
                    #{deck.standing ?? "-"}
                  </span>
                  <span className="text-[10px] font-bold text-white/45">{formatDate(deck.tournament?.startDate)}</span>
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-orange-200">
                  Abrir na Bodega
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LeaderDetails({
  leader,
  basesForLeader,
  competitiveProfile,
  onOpenDecklist,
}: {
  leader?: LiveLeader;
  basesForLeader: Array<LiveBase & { appearancesWithLeader: number; shareWithLeaderPct: number }>;
  competitiveProfile?: CompetitiveLeaderProfile;
  onOpenDecklist: (decklist: MetaStatsDecklist) => void;
}) {
  if (!leader) return null;

  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-12">
      <div className="overflow-hidden rounded-[2rem] border border-orange-400/30 bg-[#0B0C10]/78 shadow-[0_22px_80px_rgba(0,0,0,0.46)] backdrop-blur-xl">
        <div className="sunset-line" />
        <div className="space-y-6 p-5">
          <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Dossiê do líder</p>
              <div className="mt-4 flex gap-4">
                <LeaderPortrait leader={leader} className="aspect-[395/527] h-48 rounded-[1.4rem] shadow-2xl" />
                <div className="min-w-0">
                  <h2 className="text-3xl font-black leading-tight text-white">{leader.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-white/55">{leader.subtitle}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-white/40">Meta ao vivo</p>
                      <p className="mt-1 text-2xl font-black text-orange-200">{formatPct(leader.metaSharePct)}%</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-white/40">Aparições</p>
                      <p className="mt-1 text-2xl font-black text-white">{leader.appearances}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Bases usadas com este líder</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {basesForLeader.length ? (
                  basesForLeader.slice(0, 6).map((base) => (
                    <div key={base.karabastId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <CardImage imageUrl={base.imageUrl} name={base.displayName} className="h-12 w-16 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-black text-white">{base.name}</p>
                          <p className="shrink-0 text-sm font-black text-white">{formatPct(base.shareWithLeaderPct)}%</p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${Math.min(100, base.shareWithLeaderPct)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-white/55">Sem bases suficientes no snapshot atual.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-orange-300/25 bg-orange-500/10 p-4">
              <p className="text-sm font-semibold leading-6 text-orange-100/85">
                Clique em uma carta competitiva para comprar singles na Bodega ou abrir a venda das suas cartas.
              </p>
            </div>

            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Leitura competitiva</p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Cartas mais usadas com {leader.name}
                </h3>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/55">
                SWU Meta Stats
              </span>
            </div>

            <CompetitivePanel profile={competitiveProfile} onOpenDecklist={onOpenDecklist} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function MetaDashboard({
  liveGames,
  totalLiveGames,
  karabastLeaders,
  catalogCards,
  competitiveLeaderProfiles,
}: {
  liveGames: KarabastLiveGame[];
  totalLiveGames: number;
  karabastLeaders: KarabastLeader[];
  catalogCards: CatalogCard[];
  competitiveLeaderProfiles: CompetitiveLeaderProfile[];
}) {
  const [cardPool, setCardPool] = useState<CardPoolFilter>("todos");
  const [leaderSet, setLeaderSet] = useState<LeaderSetFilter>("todos");
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [selectedDecklist, setSelectedDecklist] = useState<MetaStatsDecklist | null>(null);

  const cardsByUid = useMemo(() => {
    return new Map(catalogCards.map((card) => [card.card_uid, card]));
  }, [catalogCards]);

  const leadersByKarabastId = useMemo(() => {
    return new Map(karabastLeaders.map((leader) => [leader.id, leader]));
  }, [karabastLeaders]);

  const filteredGames = useMemo(() => {
    return liveGames.filter((game) => {
      if (game.format !== "premier") return false;
      if (cardPool !== "todos" && game.cardPool !== cardPool) return false;
      return true;
    });
  }, [liveGames, cardPool]);

  const liveStats = useMemo(() => {
    const leaderCounts = new Map<string, { ref: KarabastCardRef; current: number; nextSet: number; total: number }>();
    const baseCounts = new Map<string, { ref: KarabastCardRef; total: number }>();
    const pairCounts = new Map<string, { leaderRef: KarabastCardRef; baseRef: KarabastCardRef; total: number }>();
    const basesByLeader = new Map<string, Map<string, number>>();

    const addLeader = (ref: KarabastCardRef | null, pool: string | null) => {
      if (!ref?.id || !ref.internalName) return;
      const current = leaderCounts.get(ref.id) ?? { ref, current: 0, nextSet: 0, total: 0 };
      current.total += 1;
      if (pool === "current") current.current += 1;
      if (pool === "nextSet") current.nextSet += 1;
      leaderCounts.set(ref.id, current);
    };

    const addBase = (ref: KarabastCardRef | null) => {
      if (!ref?.id || !ref.internalName) return;
      const current = baseCounts.get(ref.id) ?? { ref, total: 0 };
      current.total += 1;
      baseCounts.set(ref.id, current);
    };

    const addPair = (leaderRef: KarabastCardRef | null, baseRef: KarabastCardRef | null) => {
      if (!leaderRef?.id || !leaderRef.internalName || !baseRef?.id || !baseRef.internalName) return;
      const pairKey = `${leaderRef.id}::${baseRef.id}`;
      const current = pairCounts.get(pairKey) ?? { leaderRef, baseRef, total: 0 };
      current.total += 1;
      pairCounts.set(pairKey, current);

      const baseMap = basesByLeader.get(leaderRef.id) ?? new Map<string, number>();
      baseMap.set(baseRef.id, (baseMap.get(baseRef.id) ?? 0) + 1);
      basesByLeader.set(leaderRef.id, baseMap);
    };

    for (const game of filteredGames) {
      addLeader(game.player1Leader, game.cardPool);
      addLeader(game.player2Leader, game.cardPool);
      addBase(game.player1Base);
      addBase(game.player2Base);
      addPair(game.player1Leader, game.player1Base);
      addPair(game.player2Leader, game.player2Base);
    }

    const totalAppearances = Array.from(leaderCounts.values()).reduce((sum, row) => sum + row.total, 0) || 1;
    const totalBaseAppearances = Array.from(baseCounts.values()).reduce((sum, row) => sum + row.total, 0) || 1;

    const makeLeader = ([karabastId, row]: [string, { ref: KarabastCardRef; current: number; nextSet: number; total: number }], index: number): LiveLeader => {
      const catalog = row.ref.internalName ? cardsByUid.get(row.ref.internalName) : undefined;
      const karabastLeader = leadersByKarabastId.get(karabastId);
      const name = karabastLeader?.name ?? catalog?.title ?? karabastId;
      const subtitle = karabastLeader?.subtitle ?? catalog?.subtitle ?? "";

      return {
        rank: index + 1,
        karabastId,
        cardUid: row.ref.internalName ?? "",
        name,
        subtitle,
        displayName: subtitle ? `${name} - ${subtitle}` : name,
        expansionCode: catalog?.expansion_code ?? karabastId.split("_")[0] ?? "-",
        imageUrl: catalog?.image_front_url ?? "",
        appearances: row.total,
        metaSharePct: (row.total / totalAppearances) * 100,
        currentAppearances: row.current,
        nextSetAppearances: row.nextSet,
      };
    };

    const makeBase = ([karabastId, row]: [string, { ref: KarabastCardRef; total: number }], index: number): LiveBase => {
      const catalog = row.ref.internalName ? cardsByUid.get(row.ref.internalName) : undefined;
      const name = catalog?.title ?? karabastId;
      const subtitle = catalog?.subtitle ?? "";

      return {
        rank: index + 1,
        karabastId,
        cardUid: row.ref.internalName ?? "",
        name,
        subtitle,
        displayName: cardDisplayName(catalog),
        expansionCode: catalog?.expansion_code ?? karabastId.split("_")[0] ?? "-",
        imageUrl: catalog?.image_front_url ?? "",
        appearances: row.total,
        metaSharePct: (row.total / totalBaseAppearances) * 100,
      };
    };

    const leaders = Array.from(leaderCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(makeLeader);

    const bases = Array.from(baseCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(makeBase);

    const leaderById = new Map(leaders.map((leader) => [leader.karabastId, leader]));
    const baseById = new Map(bases.map((base) => [base.karabastId, base]));
    const totalPairs = Array.from(pairCounts.values()).reduce((sum, pair) => sum + pair.total, 0) || 1;

    const pairs = Array.from(pairCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([key, pair], index) => ({
        rank: index + 1,
        key,
        leader: leaderById.get(pair.leaderRef.id ?? "")!,
        base: baseById.get(pair.baseRef.id ?? "")!,
        appearances: pair.total,
        metaSharePct: (pair.total / totalPairs) * 100,
      }))
      .filter((pair) => pair.leader && pair.base);

    return { leaders, bases, pairs, basesByLeader, totalAppearances };
  }, [cardsByUid, filteredGames, leadersByKarabastId]);

  const visibleLeaders = useMemo(() => {
    return liveStats.leaders
      .filter((leader) => leaderSet === "todos" || leader.expansionCode === leaderSet)
      .map((leader, index) => ({
        ...leader,
        rank: index + 1,
      }));
  }, [leaderSet, liveStats.leaders]);

  const selectedLeader = visibleLeaders.find((leader) => leader.karabastId === selectedLeaderId) ?? visibleLeaders[0] ?? liveStats.leaders[0];

  const basesForSelectedLeader = useMemo(() => {
    if (!selectedLeader) return [];

    const baseCounts = liveStats.basesByLeader.get(selectedLeader.karabastId) ?? new Map<string, number>();
    const total = Array.from(baseCounts.values()).reduce((sum, count) => sum + count, 0) || 1;

    return Array.from(baseCounts.entries())
      .map(([baseId, count]) => {
        const base = liveStats.bases.find((candidate) => candidate.karabastId === baseId);
        if (!base) return null;
        return {
          ...base,
          appearancesWithLeader: count,
          shareWithLeaderPct: (count / total) * 100,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.appearancesWithLeader - a!.appearancesWithLeader) as Array<
        LiveBase & { appearancesWithLeader: number; shareWithLeaderPct: number }
      >;
  }, [liveStats.bases, liveStats.basesByLeader, selectedLeader]);

  const selectedCompetitiveProfile = useMemo(() => {
    if (!selectedLeader) return undefined;
    return competitiveLeaderProfiles.find((profile) => profile.leaderKarabastId === selectedLeader.karabastId);
  }, [competitiveLeaderProfiles, selectedLeader]);

  const currentCount = filteredGames.filter((game) => game.cardPool === "current").length;
  const currentShare = filteredGames.length ? (currentCount / filteredGames.length) * 100 : 0;
  const topLeader = visibleLeaders[0] ?? liveStats.leaders[0];
  const topBase = liveStats.bases[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050608] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_72%_5%,rgba(249,115,22,0.34),transparent_62%),radial-gradient(620px_320px_at_18%_18%,rgba(168,85,247,0.16),transparent_65%),linear-gradient(180deg,#050608_0%,#071019_44%,#050608_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 md:pt-12">
        <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-orange-400/30 bg-[#0B0C10]/72 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-10">
          <div className="sunset-line absolute left-0 right-0 top-0" />
          <div className="absolute inset-0 bg-cover bg-center md:bg-[position:center_42%]" style={{ backgroundImage: "url('/images/meta-premier-hero.png')" }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_48%,rgba(249,115,22,0.12),transparent_34%),linear-gradient(90deg,rgba(5,6,8,0.96)_0%,rgba(5,6,8,0.84)_32%,rgba(5,6,8,0.42)_58%,rgba(5,6,8,0.18)_100%),linear-gradient(180deg,rgba(5,6,8,0.1)_0%,rgba(5,6,8,0.18)_48%,rgba(5,6,8,0.78)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:46px_46px] opacity-25" />
          <div className="absolute right-8 top-8 hidden text-[150px] font-black leading-none text-white/[0.035] md:block">LIVE</div>

          <div className="relative flex min-h-[460px] max-w-3xl flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-orange-300/35 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-orange-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.9)]" />
              Karabast público · Atualização ao vivo
            </div>

            <h1 className="text-5xl font-black uppercase leading-[0.94] tracking-tight text-white drop-shadow-[0_0_32px_rgba(249,115,22,0.25)] md:text-7xl">
              Meta <span className="text-orange-300">Premier</span> Live
            </h1>

            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/75 md:text-lg">
              Painel da Bodega com dados públicos do Karabast: líderes mais usados, bases dominantes e combinações em jogos Premier em andamento.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {(["todos", "current"] as CardPoolFilter[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCardPool(mode)}
                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${cardPool === mode
                      ? "border-orange-300 bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,0.32)]"
                      : "border-white/15 bg-white/5 text-white/65 hover:border-white/30 hover:text-white"
                    }`}
                >
                  {mode === "todos" ? "Todos" : formatCardPool(mode)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-8">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Jogos Premier" value={String(filteredGames.length)} detail={`${totalLiveGames} jogos ao vivo no Karabast`} tone={0} />
          <StatCard label="Aparições" value={String(liveStats.totalAppearances)} detail="2 líderes por partida" tone={1} />
          <StatCard label="Líder dominante" value={topLeader?.name ?? "-"} detail={`${formatPct(topLeader?.metaSharePct ?? 0)}% do snapshot`} tone={2} />
          <StatCard label="Base dominante" value={topBase?.name ?? "-"} detail={`${formatPct(topBase?.metaSharePct ?? 0)}% das bases`} tone={3} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Filtro do meta atual</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${currentShare}%` }} />
              </div>
              <span className="text-sm font-black text-white">Meta atual {currentCount}</span>
              <span className="text-sm font-black text-orange-200">Todos {filteredGames.length}</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Escopo dos dados</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
              Karabast mostra o meta ao vivo. SWU Meta Stats complementa com decklists competitivas, cartas core/popular/flex e histórico de torneios.
            </p>
          </div>
        </div>
      </section>

      <LeadersBoard
        leaders={visibleLeaders}
        selectedLeaderId={selectedLeader?.karabastId ?? ""}
        onSelectLeader={setSelectedLeaderId}
        leaderSet={leaderSet}
        onSelectLeaderSet={setLeaderSet}
      />

      <BasesAndPairs bases={liveStats.bases} pairs={liveStats.pairs} />

      <LeaderDetails
        leader={selectedLeader}
        basesForLeader={basesForSelectedLeader}
        competitiveProfile={selectedCompetitiveProfile}
        onOpenDecklist={setSelectedDecklist}
      />
      <DecklistModal decklist={selectedDecklist} onClose={() => setSelectedDecklist(null)} />
    </main>
  );
}
