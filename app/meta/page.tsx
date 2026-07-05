import type { Metadata } from "next";
import { BackToTop } from "@/components/layout/BackToTop";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MetaDashboard } from "@/components/meta/MetaDashboard";
import { supabase } from "@/lib/supabaseClient";

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

type KarabastLiveResponse = {
  numberOfOngoingGames?: number;
  ongoingGames?: KarabastLiveGame[];
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
  count: number;
  section: string;
  cardName: string;
  card?: {
    name?: string;
    aspect?: string;
    cost?: number | null;
    type?: string;
    imageUrl?: string | null;
    frontText?: string | null;
    power?: string | null;
    hp?: number | null;
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

type MetaStatsArchetypeResponse = {
  notFound?: boolean;
  leaderName?: string;
  baseName?: string;
  totalDecks?: number;
  totalMetaDecks?: number;
  mainboardGroups?: {
    Core?: MetaStatsCardUsage[];
    Popular?: MetaStatsCardUsage[];
    Flex?: MetaStatsCardUsage[];
  };
  recentDecklists?: MetaStatsDecklist[];
  decklists?: MetaStatsDecklist[];
  decklistsForCombo?: MetaStatsDecklist[];
};

type MetaStatsDecklistsResponse =
  | MetaStatsDecklist[]
  | {
      decklists?: MetaStatsDecklist[];
      data?: MetaStatsDecklist[];
      results?: MetaStatsDecklist[];
      items?: MetaStatsDecklist[];
    };

type CompetitiveArchetype = {
  pairKey: string;
  leaderKarabastId: string;
  baseKarabastId: string;
  leaderName: string;
  baseName: string;
  totalDecks: number;
  totalMetaDecks: number;
  mainboardGroups: {
    Core: MetaStatsCardUsage[];
    Popular: MetaStatsCardUsage[];
    Flex: MetaStatsCardUsage[];
  };
  recentDecklists: MetaStatsDecklist[];
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

export const metadata: Metadata = {
  title: "Meta Premier ao Vivo | Bodega Galáctica",
  description: "Painel ao vivo do meta Premier de Star Wars: Unlimited com dados públicos do Karabast.",
};

async function fetchJson<T>(url: string, fallback: T, revalidate = 60): Promise<T> {
  try {
    const response = await fetch(url, { next: { revalidate } });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function collectCardUids(games: KarabastLiveGame[]) {
  const uids = new Set<string>();

  for (const game of games) {
    [
      game.player1Leader,
      game.player1Base,
      game.player2Leader,
      game.player2Base,
    ].forEach((card) => {
      if (card?.internalName) uids.add(card.internalName);
    });
  }

  return Array.from(uids);
}

function karabastLeaderDisplayName(leader?: KarabastLeader, fallback?: CatalogCard) {
  const name = leader?.name ?? fallback?.title;
  const subtitle = leader?.subtitle ?? fallback?.subtitle;

  if (!name) return "";
  return subtitle ? `${name} | ${subtitle}` : name;
}

function buildTopLivePairs(games: KarabastLiveGame[], catalogCards: CatalogCard[], karabastLeaders: KarabastLeader[]) {
  const cardsByUid = new Map(catalogCards.map((card) => [card.card_uid, card]));
  const leadersById = new Map(karabastLeaders.map((leader) => [leader.id, leader]));
  const leaderTotals = new Map<string, number>();
  const pairCounts = new Map<
    string,
    {
      count: number;
      leaderRef: KarabastCardRef;
      baseRef: KarabastCardRef;
      leaderName: string;
      baseName: string;
    }
  >();

  const addPair = (leaderRef: KarabastCardRef | null, baseRef: KarabastCardRef | null) => {
    if (!leaderRef?.id || !leaderRef.internalName || !baseRef?.id || !baseRef.internalName) return;

    const leaderCatalog = cardsByUid.get(leaderRef.internalName);
    const baseCatalog = cardsByUid.get(baseRef.internalName);
    const leaderName = karabastLeaderDisplayName(leadersById.get(leaderRef.id), leaderCatalog);
    const baseName = baseCatalog?.title ?? "";

    if (!leaderName || !baseName) return;

    const pairKey = `${leaderRef.id}::${baseRef.id}`;
    const current = pairCounts.get(pairKey) ?? {
      count: 0,
      leaderRef,
      baseRef,
      leaderName,
      baseName,
    };

    current.count += 1;
    pairCounts.set(pairKey, current);
    leaderTotals.set(leaderRef.id, (leaderTotals.get(leaderRef.id) ?? 0) + 1);
  };

  for (const game of games) {
    if (game.format !== "premier") continue;
    addPair(game.player1Leader, game.player1Base);
    addPair(game.player2Leader, game.player2Base);
  }

  const sortedPairs = Array.from(pairCounts.entries()).sort((a, b) => b[1].count - a[1].count);
  const topLeaderIds = Array.from(leaderTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([leaderId]) => leaderId);
  const candidatePairs = new Map<string, (typeof sortedPairs)[number]>();

  for (const pair of sortedPairs.slice(0, 14)) {
    candidatePairs.set(pair[0], pair);
  }

  for (const leaderId of topLeaderIds) {
    sortedPairs
      .filter(([, pair]) => pair.leaderRef.id === leaderId)
      .slice(0, 6)
      .forEach((pair) => candidatePairs.set(pair[0], pair));
  }

  return Array.from(candidatePairs.values())
    .slice(0, 36)
    .map(([pairKey, pair]) => ({
      pairKey,
      leaderKarabastId: pair.leaderRef.id ?? "",
      baseKarabastId: pair.baseRef.id ?? "",
      leaderName: pair.leaderName,
      baseName: pair.baseName,
	    }));
}

function buildLiveLeaderCandidates(games: KarabastLiveGame[], catalogCards: CatalogCard[], karabastLeaders: KarabastLeader[]) {
  const cardsByUid = new Map(catalogCards.map((card) => [card.card_uid, card]));
  const leadersById = new Map(karabastLeaders.map((leader) => [leader.id, leader]));
  const leaderCounts = new Map<
    string,
    {
      count: number;
      leaderRef: KarabastCardRef;
      leaderName: string;
      expansionCode: string;
    }
  >();

  const addLeader = (leaderRef: KarabastCardRef | null) => {
    if (!leaderRef?.id || !leaderRef.internalName) return;

    const leaderCatalog = cardsByUid.get(leaderRef.internalName);
    const leaderName = karabastLeaderDisplayName(leadersById.get(leaderRef.id), leaderCatalog);

    if (!leaderName) return;

    const current = leaderCounts.get(leaderRef.id) ?? {
      count: 0,
      leaderRef,
      leaderName,
      expansionCode: leaderCatalog?.expansion_code ?? leaderRef.id.split("_")[0] ?? "-",
    };

    current.count += 1;
    leaderCounts.set(leaderRef.id, current);
  };

  for (const game of games) {
    if (game.format !== "premier") continue;
    addLeader(game.player1Leader);
    addLeader(game.player2Leader);
  }

  const sortedLeaders = Array.from(leaderCounts.entries()).sort((a, b) => b[1].count - a[1].count);
  const candidates = new Map<string, (typeof sortedLeaders)[number]>();

  for (const leader of sortedLeaders.slice(0, 18)) {
    candidates.set(leader[0], leader);
  }

  for (const setCode of ["ASH", "LAW", "SEC", "LOF", "JTL"]) {
    sortedLeaders
      .filter(([, leader]) => leader.expansionCode === setCode)
      .slice(0, 8)
      .forEach((leader) => candidates.set(leader[0], leader));
  }

  return Array.from(candidates.values()).map(([leaderKarabastId, leader]) => ({
    leaderKarabastId,
    leaderName: leader.leaderName,
  }));
}

async function fetchCompetitiveArchetypes(topPairs: ReturnType<typeof buildTopLivePairs>) {
  const results = await Promise.all(
    topPairs.map(async (pair) => {
      const url = `https://swumetastats.com/api/archetypes/${encodeURIComponent(pair.leaderName)}/${encodeURIComponent(pair.baseName)}`;
      const response = await fetchJson<MetaStatsArchetypeResponse | null>(url, null, 600);

      if (!response || response.notFound) return null;

      return {
        pairKey: pair.pairKey,
        leaderKarabastId: pair.leaderKarabastId,
        baseKarabastId: pair.baseKarabastId,
        leaderName: response.leaderName ?? pair.leaderName,
        baseName: response.baseName ?? pair.baseName,
        totalDecks: Number(response.totalDecks ?? 0),
        totalMetaDecks: Number(response.totalMetaDecks ?? 0),
        mainboardGroups: {
          Core: response.mainboardGroups?.Core ?? [],
          Popular: response.mainboardGroups?.Popular ?? [],
          Flex: response.mainboardGroups?.Flex ?? [],
        },
        recentDecklists: (response.recentDecklists ?? response.decklistsForCombo ?? response.decklists ?? []).slice(0, 6),
      } satisfies CompetitiveArchetype;
    })
  );

  return results.filter(Boolean) as CompetitiveArchetype[];
}

function readDecklistsResponse(response: MetaStatsDecklistsResponse | null) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.decklists ?? response.data ?? response.results ?? response.items ?? [];
}

async function fetchCompetitiveLeaderDecklists(leaders: ReturnType<typeof buildLiveLeaderCandidates>) {
  const results = await Promise.all(
    leaders.map(async (leader) => {
      const url = `https://swumetastats.com/api/decklists?leaderName=${encodeURIComponent(leader.leaderName)}&pageSize=24&limit=24`;
      const response = await fetchJson<MetaStatsDecklistsResponse | null>(url, null, 600);
      const allDecklists = readDecklistsResponse(response);
      const decklistsWithCards = allDecklists.filter((deck) => deck.cards?.length);

      if (decklistsWithCards.length) {
        return buildProfileFromDecklists(leader.leaderKarabastId, leader.leaderName, decklistsWithCards);
      }

      const baseNames = Array.from(
        new Set(allDecklists.map((deck) => deck.baseName).filter(Boolean) as string[])
      ).slice(0, 6);

      if (!baseNames.length) return null;

      const archetypes = await Promise.all(
        baseNames.map(async (baseName) => {
          const archetypeUrl = `https://swumetastats.com/api/archetypes/${encodeURIComponent(leader.leaderName)}/${encodeURIComponent(baseName)}`;
          const archetypeResponse = await fetchJson<MetaStatsArchetypeResponse | null>(archetypeUrl, null, 600);

          if (!archetypeResponse || archetypeResponse.notFound) return null;

          return {
            pairKey: `${leader.leaderKarabastId}::${baseName}`,
            leaderKarabastId: leader.leaderKarabastId,
            baseKarabastId: baseName,
            leaderName: archetypeResponse.leaderName ?? leader.leaderName,
            baseName: archetypeResponse.baseName ?? baseName,
            totalDecks: Number(archetypeResponse.totalDecks ?? 0),
            totalMetaDecks: Number(archetypeResponse.totalMetaDecks ?? 0),
            mainboardGroups: {
              Core: archetypeResponse.mainboardGroups?.Core ?? [],
              Popular: archetypeResponse.mainboardGroups?.Popular ?? [],
              Flex: archetypeResponse.mainboardGroups?.Flex ?? [],
            },
            recentDecklists: (archetypeResponse.recentDecklists ?? archetypeResponse.decklistsForCombo ?? archetypeResponse.decklists ?? []).slice(0, 6),
          } satisfies CompetitiveArchetype;
        })
      );

      return buildCompetitiveLeaderProfiles(archetypes.filter(Boolean) as CompetitiveArchetype[])[0] ?? null;
    })
  );

  return results.filter(Boolean) as CompetitiveLeaderProfile[];
}

function numberValue(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanCompetitiveCardName(cardName: string) {
  return cardName.replace(/^\d+\s+/, "").trim();
}

function cleanCatalogText(value: unknown) {
  if (typeof value !== "string") return "";

  const cleaned = value.trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("{") || cleaned.startsWith("[") || cleaned.includes('"data"') || cleaned.includes('"attributes"')) return "";
  if (cleaned === "[object Object]") return "";

  return cleaned;
}

function splitCompetitiveCardName(cardName: string) {
  const cleaned = cleanCompetitiveCardName(cardName);
  const separator = cleaned.includes(" | ") ? " | " : cleaned.includes(" - ") ? " - " : "";

  if (!separator) {
    return {
      title: cleaned,
      subtitle: "",
    };
  }

  const [title, ...subtitleParts] = cleaned.split(separator);
  return {
    title: title.trim(),
    subtitle: subtitleParts.join(separator).trim(),
  };
}

function normalizeCardMatchKey(title: string, subtitle?: string | null) {
  return `${title} ${cleanCatalogText(subtitle)}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function usageScore(card: MetaStatsCardUsage) {
  return numberValue(card.pct3) + numberValue(card.pct2) + numberValue(card.pct1);
}

function aggregateUsageCards(archetypes: CompetitiveArchetype[], groupName: keyof CompetitiveArchetype["mainboardGroups"]) {
  const cardsByName = new Map<
    string,
    {
      cardName: string;
      cardUid?: string;
      displayName?: string;
      subtitle?: string | null;
      expansionCode?: string | null;
      cardType?: string | null;
      imageUrl?: string | null;
      searchHref?: string;
      raw3: number;
      raw2: number;
      raw1: number;
      pct3Weighted: number;
      pct2Weighted: number;
      pct1Weighted: number;
      weight: number;
    }
  >();

  for (const archetype of archetypes) {
    const weight = Math.max(archetype.totalDecks, 1);

    for (const card of archetype.mainboardGroups[groupName] ?? []) {
      if (!card.cardName) continue;

      const current = cardsByName.get(card.cardName) ?? {
        cardName: card.cardName,
        cardUid: card.cardUid,
        displayName: card.displayName,
        subtitle: card.subtitle,
        expansionCode: card.expansionCode,
        cardType: card.cardType,
        imageUrl: card.imageUrl,
        searchHref: card.searchHref,
        raw3: 0,
        raw2: 0,
        raw1: 0,
        pct3Weighted: 0,
        pct2Weighted: 0,
        pct1Weighted: 0,
        weight: 0,
      };

      current.cardUid = current.cardUid ?? card.cardUid;
      current.displayName = current.displayName ?? card.displayName;
      current.subtitle = current.subtitle ?? card.subtitle;
      current.expansionCode = current.expansionCode ?? card.expansionCode;
      current.cardType = current.cardType ?? card.cardType;
      current.imageUrl = current.imageUrl ?? card.imageUrl;
      current.searchHref = current.searchHref ?? card.searchHref;
      current.raw3 += numberValue(card.raw3);
      current.raw2 += numberValue(card.raw2);
      current.raw1 += numberValue(card.raw1);
      current.pct3Weighted += numberValue(card.pct3) * weight;
      current.pct2Weighted += numberValue(card.pct2) * weight;
      current.pct1Weighted += numberValue(card.pct1) * weight;
      current.weight += weight;
      cardsByName.set(card.cardName, current);
    }
  }

  return Array.from(cardsByName.values())
    .map((card) => ({
      cardName: cleanCompetitiveCardName(card.cardName),
      cardUid: card.cardUid,
      displayName: card.displayName,
      subtitle: card.subtitle,
      expansionCode: card.expansionCode,
      cardType: card.cardType,
      imageUrl: card.imageUrl,
      searchHref: card.searchHref,
      raw3: card.raw3,
      raw2: card.raw2,
      raw1: card.raw1,
      pct3: card.weight ? card.pct3Weighted / card.weight : 0,
      pct2: card.weight ? card.pct2Weighted / card.weight : 0,
      pct1: card.weight ? card.pct1Weighted / card.weight : 0,
    }))
    .sort((a, b) => usageScore(b) - usageScore(a))
    .slice(0, 18);
}

function buildCompetitiveLeaderProfiles(archetypes: CompetitiveArchetype[]) {
  const byLeader = new Map<string, CompetitiveArchetype[]>();

  for (const archetype of archetypes) {
    if (!archetype.leaderKarabastId) continue;
    const current = byLeader.get(archetype.leaderKarabastId) ?? [];
    current.push(archetype);
    byLeader.set(archetype.leaderKarabastId, current);
  }

  return Array.from(byLeader.entries()).map(([leaderKarabastId, leaderArchetypes]) => {
    const decklistsByGuid = new Map<string, MetaStatsDecklist>();

    for (const archetype of leaderArchetypes) {
      for (const deck of archetype.recentDecklists) {
        if (deck.guid && !decklistsByGuid.has(deck.guid)) {
          decklistsByGuid.set(deck.guid, deck);
        }
      }
    }

    return {
      leaderKarabastId,
      leaderName: leaderArchetypes[0]?.leaderName ?? "",
      totalDecks: leaderArchetypes.reduce((sum, archetype) => sum + archetype.totalDecks, 0),
      totalMetaDecks: leaderArchetypes.reduce((sum, archetype) => sum + archetype.totalMetaDecks, 0),
      bases: leaderArchetypes
        .map((archetype) => ({
          baseKarabastId: archetype.baseKarabastId,
          baseName: archetype.baseName,
          totalDecks: archetype.totalDecks,
        }))
        .sort((a, b) => b.totalDecks - a.totalDecks),
      mainboardGroups: {
        Core: aggregateUsageCards(leaderArchetypes, "Core"),
        Popular: aggregateUsageCards(leaderArchetypes, "Popular"),
        Flex: aggregateUsageCards(leaderArchetypes, "Flex"),
      },
      recentDecklists: Array.from(decklistsByGuid.values()).slice(0, 6),
    } satisfies CompetitiveLeaderProfile;
  });
}

function isMainboardCard(card: MetaStatsDecklistCard) {
  const section = card.section?.toLowerCase() ?? "";
  return !section.includes("side") && !section.includes("base") && !section.includes("leader");
}

function buildUsageGroupsFromDecklists(decklists: MetaStatsDecklist[]) {
  const totalDecks = decklists.length || 1;
  const cardsByName = new Map<
    string,
    {
      cardName: string;
      imageUrl?: string | null;
      cardType?: string | null;
      cost?: number | null;
      raw3: number;
      raw2: number;
      raw1: number;
    }
  >();

  for (const deck of decklists) {
    const copiesByName = new Map<string, number>();
    const cardMetaByName = new Map<string, { imageUrl?: string | null; cardType?: string | null; cost?: number | null }>();

    for (const card of deck.cards ?? []) {
      if (!isMainboardCard(card)) continue;

      const cardName = cleanCompetitiveCardName(card.cardName || card.card?.name || "");
      if (!cardName) continue;

      copiesByName.set(cardName, (copiesByName.get(cardName) ?? 0) + numberValue(card.count));
      cardMetaByName.set(cardName, {
        imageUrl: cardMetaByName.get(cardName)?.imageUrl ?? card.card?.imageUrl,
        cardType: cardMetaByName.get(cardName)?.cardType ?? card.card?.type,
        cost: cardMetaByName.get(cardName)?.cost ?? card.card?.cost,
      });
    }

    for (const [cardName, copies] of copiesByName.entries()) {
      const cardMeta = cardMetaByName.get(cardName);
      const current = cardsByName.get(cardName) ?? {
        cardName,
        imageUrl: cardMeta?.imageUrl,
        cardType: cardMeta?.cardType,
        cost: cardMeta?.cost,
        raw3: 0,
        raw2: 0,
        raw1: 0,
      };

      current.imageUrl = current.imageUrl ?? cardMeta?.imageUrl;
      current.cardType = current.cardType ?? cardMeta?.cardType;
      current.cost = current.cost ?? cardMeta?.cost;

      if (copies >= 3) current.raw3 += 1;
      else if (copies === 2) current.raw2 += 1;
      else current.raw1 += 1;

      cardsByName.set(cardName, current);
    }
  }

  const usageCards = Array.from(cardsByName.values())
    .map((card) => ({
      ...card,
      displayName: card.cardName,
      cardType: card.cardType ?? (card.cost != null ? `Custo ${card.cost}` : null),
      imageUrl: card.imageUrl ?? null,
      searchHref: `/cartas?search=${encodeURIComponent(card.cardName)}`,
      pct3: (card.raw3 / totalDecks) * 100,
      pct2: (card.raw2 / totalDecks) * 100,
      pct1: (card.raw1 / totalDecks) * 100,
    }))
    .sort((a, b) => usageScore(b) - usageScore(a));

  return {
    Core: usageCards.filter((card) => usageScore(card) >= 70).slice(0, 18),
    Popular: usageCards.filter((card) => usageScore(card) < 70 && usageScore(card) >= 35).slice(0, 18),
    Flex: usageCards.filter((card) => usageScore(card) < 35).slice(0, 18),
  };
}

function buildProfileFromDecklists(leaderKarabastId: string, leaderName: string, decklists: MetaStatsDecklist[]) {
  const basesByName = new Map<string, number>();

  for (const deck of decklists) {
    if (!deck.baseName) continue;
    basesByName.set(deck.baseName, (basesByName.get(deck.baseName) ?? 0) + 1);
  }

  return {
    leaderKarabastId,
    leaderName,
    totalDecks: decklists.length,
    totalMetaDecks: decklists.length,
    bases: Array.from(basesByName.entries())
      .map(([baseName, totalDecks]) => ({
        baseKarabastId: baseName,
        baseName,
        totalDecks,
      }))
      .sort((a, b) => b.totalDecks - a.totalDecks),
    mainboardGroups: buildUsageGroupsFromDecklists(decklists),
    recentDecklists: decklists.slice(0, 6),
  } satisfies CompetitiveLeaderProfile;
}

function hasCompetitiveCards(profile: CompetitiveLeaderProfile) {
  return Boolean(
    profile.mainboardGroups.Core.length ||
      profile.mainboardGroups.Popular.length ||
      profile.mainboardGroups.Flex.length
  );
}

function mergeCompetitiveLeaderProfiles(
  decklistProfiles: CompetitiveLeaderProfile[],
  archetypeProfiles: CompetitiveLeaderProfile[]
) {
  const profiles = new Map<string, CompetitiveLeaderProfile>();

  for (const profile of archetypeProfiles) {
    if (hasCompetitiveCards(profile)) profiles.set(profile.leaderKarabastId, profile);
  }

  for (const profile of decklistProfiles) {
    if (hasCompetitiveCards(profile)) profiles.set(profile.leaderKarabastId, profile);
  }

  return Array.from(profiles.values());
}

function collectCompetitiveCardNames(profiles: CompetitiveLeaderProfile[]) {
  const names = new Set<string>();

  for (const profile of profiles) {
    for (const group of Object.values(profile.mainboardGroups)) {
      for (const card of group) {
        if (card.cardName) names.add(cleanCompetitiveCardName(card.cardName));
      }
    }
  }

  return Array.from(names);
}

function enrichUsageCard(card: MetaStatsCardUsage, catalogByName: Map<string, CatalogCard>) {
  const parts = splitCompetitiveCardName(card.cardName);
  const exactKey = normalizeCardMatchKey(parts.title, parts.subtitle);
  const titleOnlyKey = normalizeCardMatchKey(parts.title);
  const catalog = catalogByName.get(exactKey) ?? catalogByName.get(titleOnlyKey);

  if (!catalog) {
    return {
      ...card,
      cardName: cleanCompetitiveCardName(card.cardName),
      displayName: card.displayName ?? cleanCompetitiveCardName(card.cardName),
      searchHref: card.searchHref ?? `/cartas?search=${encodeURIComponent(cleanCompetitiveCardName(card.cardName))}`,
    };
  }

  const catalogSubtitle = cleanCatalogText(catalog.subtitle);
  const catalogCardType = cleanCatalogText(catalog.card_type);
  const displayName = catalogSubtitle ? `${catalog.title} - ${catalogSubtitle}` : catalog.title;

  return {
    ...card,
    cardName: displayName,
    cardUid: catalog.card_uid,
    displayName: catalog.title,
    subtitle: catalogSubtitle || null,
    expansionCode: catalog.expansion_code,
    cardType: catalogCardType || null,
    imageUrl: catalog.image_front_url,
    searchHref: `/cartas?card_uid=${catalog.card_uid}`,
  };
}

function enrichCompetitiveLeaderProfiles(profiles: CompetitiveLeaderProfile[], catalogCards: CatalogCard[]) {
  const catalogByName = new Map<string, CatalogCard>();

  for (const card of catalogCards) {
    const catalogSubtitle = cleanCatalogText(card.subtitle);
    const exactKey = normalizeCardMatchKey(card.title, catalogSubtitle);
    const titleOnlyKey = normalizeCardMatchKey(card.title);

    if (!catalogByName.has(exactKey)) catalogByName.set(exactKey, card);
    if (!catalogSubtitle && !catalogByName.has(titleOnlyKey)) catalogByName.set(titleOnlyKey, card);
  }

  return profiles.map((profile) => ({
    ...profile,
    mainboardGroups: {
      Core: profile.mainboardGroups.Core.map((card) => enrichUsageCard(card, catalogByName)),
      Popular: profile.mainboardGroups.Popular.map((card) => enrichUsageCard(card, catalogByName)),
      Flex: profile.mainboardGroups.Flex.map((card) => enrichUsageCard(card, catalogByName)),
    },
  }));
}

export default async function MetaPage() {
  const [liveResponse, karabastLeaders] = await Promise.all([
    fetchJson<KarabastLiveResponse>("https://api.karabast.net/api/ongoing-games", {
      numberOfOngoingGames: 0,
      ongoingGames: [],
    }),
    fetchJson<KarabastLeader[]>("https://api.karabast.net/api/all-leaders", []),
  ]);

  const liveGames = liveResponse.ongoingGames ?? [];
  const cardUids = collectCardUids(liveGames);

  const { data: catalogCards } = cardUids.length
    ? await supabase
        .from("swu_cards")
        .select("card_uid, title, subtitle, expansion_code, card_number, card_type, image_front_url")
        .in("card_uid", cardUids)
        .order("card_number", { ascending: true })
    : { data: [] as CatalogCard[] };

  const topLivePairs = buildTopLivePairs(liveGames, (catalogCards ?? []) as CatalogCard[], karabastLeaders);
  const liveLeaderCandidates = buildLiveLeaderCandidates(liveGames, (catalogCards ?? []) as CatalogCard[], karabastLeaders);
  const [competitiveArchetypes, decklistLeaderProfiles] = await Promise.all([
    fetchCompetitiveArchetypes(topLivePairs),
    fetchCompetitiveLeaderDecklists(liveLeaderCandidates),
  ]);
  const competitiveLeaderProfiles = mergeCompetitiveLeaderProfiles(
    decklistLeaderProfiles,
    buildCompetitiveLeaderProfiles(competitiveArchetypes)
  );
  const competitiveCardNames = collectCompetitiveCardNames(competitiveLeaderProfiles);
  const competitiveCardTitles = Array.from(
    new Set(competitiveCardNames.map((cardName) => splitCompetitiveCardName(cardName).title).filter(Boolean))
  );
  const { data: competitiveCatalogCards } = competitiveCardTitles.length
    ? await supabase
        .from("swu_cards")
        .select("card_uid, title, subtitle, expansion_code, card_number, card_type, image_front_url")
        .in("title", competitiveCardTitles)
        .order("card_number", { ascending: true })
    : { data: [] as CatalogCard[] };
  const enrichedCompetitiveLeaderProfiles = enrichCompetitiveLeaderProfiles(
    competitiveLeaderProfiles,
    (competitiveCatalogCards ?? []) as CatalogCard[]
  );

  return (
    <>
      <MetaDashboard
        liveGames={liveGames}
        totalLiveGames={liveResponse.numberOfOngoingGames ?? liveGames.length}
        karabastLeaders={karabastLeaders}
        catalogCards={(catalogCards ?? []) as CatalogCard[]}
        competitiveLeaderProfiles={enrichedCompetitiveLeaderProfiles}
      />
      <BackToTop />
      <SiteFooter />
    </>
  );
}
