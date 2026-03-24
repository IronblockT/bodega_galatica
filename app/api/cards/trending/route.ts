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
      return NextResponse.json(
        { ok: false, error: trendingError.message },
        { status: 500 }
      );
    }

    const trending = (trendingData ?? []) as TrendingRow[];

    if (trending.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const cardUids = Array.from(new Set(trending.map((r) => r.card_uid)));

    const { data: cardsData, error: cardsError } = await supabase
      .from("swu_cards_ui")
      .select("card_uid, title, subtitle, expansion_code, rarity_label, image_front_url")
      .in("card_uid", cardUids);

    if (cardsError) {
      return NextResponse.json(
        { ok: false, error: cardsError.message },
        { status: 500 }
      );
    }

    const cards = (cardsData ?? []) as CardUiRow[];
    const cardByUid = new Map(cards.map((c) => [c.card_uid, c]));

    const items = trending.map((row) => {
      const card = cardByUid.get(row.card_uid);

      const title = card?.title ?? "Carta sem nome";
      const subtitle = card?.subtitle?.trim() || "";
      const fullName = subtitle ? `${title} — ${subtitle}` : title;

      const finish = String(row.finish ?? "standard");
      const condition = String(row.condition ?? "NM");

      return {
        id: row.card_uid,
        card_uid: row.card_uid,
        sku_key: row.sku_key,
        name: fullName,
        setCode: card?.expansion_code ?? "SWU",
        rarity: card?.rarity_label ?? "—",
        price: Number(row.preco_atual ?? 0),
        previousPrice: Number(row.preco_anterior ?? 0),
        spikeBrl: Number(row.aumento_brl ?? 0),
        spikePct: Number(row.aumento_pct ?? 0),
        finish,
        promoType: row.promo_type,
        condition,
        imageSrc: card?.image_front_url || "/swu/cards/placeholder.png",
        href: `/cartas/${encodeURIComponent(row.card_uid)}?finish=${encodeURIComponent(finish)}&cond=${encodeURIComponent(condition)}`,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Erro interno ao buscar trending cards." },
      { status: 500 }
    );
  }
}