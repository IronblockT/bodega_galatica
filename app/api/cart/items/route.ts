import { NextResponse } from "next/server";

type Body = {
  sku_keys: string[];
};

function buildInFilter(values: string[]) {
  const quoted = values.map((v) => `"${String(v).replaceAll('"', '\\"')}"`).join(",");
  return encodeURIComponent(`(${quoted})`);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const skuKeys = Array.from(
      new Set((body?.sku_keys ?? []).map((x) => String(x ?? "").trim()).filter(Boolean))
    );

    if (!skuKeys.length) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const sb = async (path: string) => {
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method: "GET",
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Supabase error ${res.status}: ${txt}`);
      }

      return res.json();
    };

    const skuIn = buildInFilter(skuKeys);

    const priceRows = await sb(
      `swu_price_current?select=sku_key,card_uid,finish,promo_type,condition,price_brl&sku_key=in.${skuIn}`
    );

    const cardUidSet = new Set<string>();

    for (const row of priceRows as any[]) {
      if (typeof row?.card_uid === "string" && row.card_uid.trim()) {
        cardUidSet.add(row.card_uid.trim());
      }
    }

    const cardUids: string[] = Array.from(cardUidSet);

    let cardRows: any[] = [];

    if (cardUids.length) {
      const cardUidIn = buildInFilter(cardUids);

      try {
        cardRows = await sb(
          `swu_cards_market_ui?select=card_uid,title,subtitle,image_front_url,image_thumb_url,min_price_brl_nm&card_uid=in.${cardUidIn}`
        );
      } catch {
        try {
          cardRows = await sb(
            `swu_cards_finish_ui?select=card_uid,title,subtitle,image_front_url,image_thumb_url&card_uid=in.${cardUidIn}`
          );
        } catch {
          cardRows = await sb(
            `swu_cards?select=card_uid,title,subtitle,image_front_url,image_thumb_url&card_uid=in.${cardUidIn}`
          );
        }
      }
    }

    const cardMap = new Map((cardRows ?? []).map((r: any) => [r.card_uid, r]));

    const items = (priceRows ?? []).map((row: any) => {
      const card = cardMap.get(row.card_uid);

      return {
        sku_key: row.sku_key,
        card_uid: row.card_uid ?? null,
        name: card?.title ?? row.card_uid ?? row.sku_key,
        subtitle: card?.subtitle ?? null,
        image_url: card?.image_thumb_url ?? card?.image_front_url ?? null,
        finish: row.finish ?? null,
        condition: row.condition ?? null,
        promo_type: row.promo_type ?? null,
        price_brl: row.price_brl ?? card?.min_price_brl_nm ?? null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}