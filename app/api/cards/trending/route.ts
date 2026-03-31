import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type TrendingRow = {
  card_uid: string;
  sku_key: string;
  finish: string;
  promo_type: string;
  condition: string;
  preco_anterior: number;
  preco_atual: number;
  aumento_brl: number;
  aumento_pct: number;
  created_at: string;
};

type CardUiRow = {
  card_uid: string;
  title: string;
  subtitle: string | null;
  expansion_code: string | null;
  rarity_label: string | null;
  image_front_url: string | null;
};

export async function GET() {
  try {
    const { data: trendingData, error: trendingError } = await supabase
      .from("swu_trending_cards")
      .select(
        "card_uid, sku_key, finish, promo_type, condition, preco_anterior, preco_atual, aumento_brl, aumento_pct, created_at"
      )
      .order("aumento_pct", { ascending: false })
      .order("aumento_brl", { ascending: false })
      .limit(10);

    if (trendingError) {
      console.error("[trending API] swu_trending_cards error:", trendingError);
      return NextResponse.json(
        {
          ok: false,
          stage: "swu_trending_cards",
          error: trendingError.message,
          details: trendingError,
        },
        { status: 500 }
      );
    }

    const trending = (trendingData ?? []) as TrendingRow[];

    console.log("[trending API] trending rows:", trending.length, trending);

    if (trending.length === 0) {
      return NextResponse.json({
        ok: true,
        stage: "empty_trending",
        items: [],
      });
    }

    const cardUids = Array.from(new Set(trending.map((r) => r.card_uid)));

    const { data: cardsData, error: cardsError } = await supabase
      .from("swu_cards_ui")
      .select(
        "card_uid, title, subtitle, expansion_code, rarity_label, image_front_url"
      )
      .in("card_uid", cardUids);

    if (cardsError) {
      console.error("[trending API] swu_cards_ui error:", cardsError);
      return NextResponse.json(
        {
          ok: false,
          stage: "swu_cards_ui",
          error: cardsError.message,
          details: cardsError,
          cardUids,
        },
        { status: 500 }
      );
    }

    const cards = (cardsData ?? []) as CardUiRow[];

    console.log("[trending API] cards rows:", cards.length, cards);

    const cardByUid = new Map<string, CardUiRow>(
      cards.map((c) => [c.card_uid, c])
    );

    const items = trending.map((row) => {
      const card = cardByUid.get(row.card_uid);

      return {
        id: row.card_uid,
        card_uid: row.card_uid,
        sku_key: row.sku_key,
        title: card?.title ?? "Carta sem nome",
        subtitle: card?.subtitle ?? "",
        expansion_code: card?.expansion_code ?? "SWU",
        rarity_label: card?.rarity_label ?? "—",
        image_front_url: card?.image_front_url ?? "/swu/cards/placeholder.png",
        price: Number(row.preco_atual ?? 0),
        previousPrice: Number(row.preco_anterior ?? 0),
        spikeBrl: Number(row.aumento_brl ?? 0),
        spikePct: Number(row.aumento_pct ?? 0),
        finish: String(row.finish ?? "standard"),
        promo_type: row.promo_type,
        condition: String(row.condition ?? "NM"),
        href: `/cartas/${encodeURIComponent(row.card_uid)}?finish=${encodeURIComponent(
          String(row.finish ?? "standard")
        )}&cond=${encodeURIComponent(String(row.condition ?? "NM"))}`,
      };
    });

    return NextResponse.json({
      ok: true,
      stage: "done",
      items,
    });
  } catch (error: unknown) {
    console.error("[trending API] unexpected error:", error);

    return NextResponse.json(
      {
        ok: false,
        stage: "catch",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}