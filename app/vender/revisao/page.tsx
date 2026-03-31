import Link from "next/link";
import { headers } from "next/headers";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";

type Quote = {
  sku_key: string;
  card_uid: string;
  finish: string;
  promo_type: string;
  condition: string;
  quantity: number;
  sell_price: number | string;
  pricing_rule_id: string | null;
  rule_name: string | null;
  calculation_type: string | null;
  base_buy_price_unit: number | string;
  stock_reduction_percent: number | string;
  adjusted_buy_price_unit: number | string;
  rounded_buy_price_unit: number | string;
  buy_price_total: number | string;
  max_qty_per_sku: number;
  stock_on_hand: number;
  stock_reserved: number;
  is_paused_by_stock: boolean;
  exceeds_qty_limit: boolean;
  manual_review_required: boolean;
  review_reason: string | null;
  cash_available: number | string;
  buy_budget_left_total: number | string;
  cash_allowed: boolean;
  store_credit_allowed: boolean;
  allowed_payout_type: string | null;
  is_buylist_available: boolean;
  unavailable_reason: string | null;
};

type CardRow = {
  card_uid: string;
  expansion_code: string;
  title: string;
  subtitle: string | null;
  image_front_url: string | null;
  card_type_label: string | null;
  rarity_label: string | null;
};

async function getBaseUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (siteUrl) {
    return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  }

  if (appUrl) {
    return appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";

  if (!host) {
    throw new Error(
      "Base URL não pôde ser resolvida. Configure NEXT_PUBLIC_SITE_URL em produção."
    );
  }

  return `${proto}://${host}`;
}

async function getQuote(sku: string, qty: number): Promise<Quote | null> {
  const baseUrl = await getBaseUrl();

  const res = await fetch(`${baseUrl}/api/buylist/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sku_key: sku,
      quantity: qty,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok || !json?.quote) {
    return null;
  }

  return json.quote as Quote;
}

async function getCard(cardUid: string): Promise<CardRow | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas em produção."
    );
  }

  const url =
    `${supabaseUrl}/rest/v1/swu_cards_ui` +
    `?select=card_uid,expansion_code,title,subtitle,image_front_url,card_type_label,rarity_label` +
    `&card_uid=eq.${encodeURIComponent(cardUid)}` +
    `&limit=1`;

  const res = await fetch(url, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const rows = (await res.json().catch(() => null)) as CardRow[] | null;
  return rows?.[0] ?? null;
}

export default async function VenderRevisaoPage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string; qty?: string }>;
}) {
  const sp = await searchParams;

  const sku = String(sp?.sku ?? "").trim();
  const qty = Math.max(parseInt(String(sp?.qty ?? "1"), 10) || 1, 1);

  if (!sku) {
    return (
      <>
        <main className="relative min-h-screen bg-[#F6F0E6]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-10">
            <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-8 text-white shadow-2xl">
              <h1 className="text-2xl font-semibold">Oferta inválida</h1>
              <p className="mt-3 text-white/70">
                Não foi possível identificar a carta selecionada.
              </p>
              <Link
                href="/vender"
                className="mt-6 inline-flex rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-[#0B0C10]"
              >
                Voltar para vender
              </Link>
            </div>
          </div>
          <BackToTop />
        </main>
        <SiteFooter />
      </>
    );
  }

  const quote = await getQuote(sku, qty);

  if (!quote) {
    return (
      <>
        <main className="relative min-h-screen bg-[#F6F0E6]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-10">
            <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/95 p-8 text-white shadow-2xl">
              <h1 className="text-2xl font-semibold">Não foi possível calcular a oferta</h1>
              <p className="mt-3 text-white/70">
                Tente novamente a partir da página de venda.
              </p>
              <Link
                href="/vender"
                className="mt-6 inline-flex rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-[#0B0C10]"
              >
                Voltar para vender
              </Link>
            </div>
          </div>
          <BackToTop />
        </main>
        <SiteFooter />
      </>
    );
  }

  const card = await getCard(quote.card_uid);
  const displayName = card
    ? card.subtitle
      ? `${card.title}, ${card.subtitle}`
      : card.title
    : quote.card_uid;

  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
          <div className="mb-8">
            <h1 className="text-4xl font-semibold tracking-tight text-black md:text-5xl">
              Revisão da venda
            </h1>
            <p className="mt-4 text-lg text-black/65">
              Revise os dados da sua oferta antes de seguir para as próximas etapas.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
            <div className="sunset-line" />

            <div className="grid gap-8 p-6 md:grid-cols-[220px_1fr] md:p-8">
              <div>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {card?.image_front_url ? (
                    <img
                      src={card.image_front_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex min-h-[300px] items-center justify-center text-sm text-white/50">
                      Sem imagem
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                  Oferta de venda
                </div>

                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  {displayName}
                </h2>

                <p className="mt-2 text-sm text-white/60">
                  {card?.card_type_label ?? "—"} • {card?.expansion_code ?? "—"} •{" "}
                  {quote.finish} • {quote.promo_type}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs uppercase tracking-wide text-white/45">
                      Condição
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {quote.condition}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs uppercase tracking-wide text-white/45">
                      Quantidade
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {quote.quantity}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs uppercase tracking-wide text-white/45">
                      Valor por unidade
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      R$ {Number(quote.rounded_buy_price_unit || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs uppercase tracking-wide text-white/45">
                      Valor total estimado
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      R$ {Number(quote.buy_price_total || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {quote.manual_review_required ? (
                  <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                    Esta oferta pode passar por uma revisão manual antes da confirmação final.
                  </div>
                ) : null}

                {!quote.is_buylist_available ? (
                  <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                    No momento não estamos comprando esta carta. Você pode voltar e consultar outras opções mais tarde.
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                    Sua oferta está pronta para seguir para a próxima etapa.
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Link
                    href="/vender"
                    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                  >
                    Voltar
                  </Link>

                  {quote.is_buylist_available ? (
                    <Link
                      href={`/vender/recebimento?sku=${encodeURIComponent(sku)}&qty=${encodeURIComponent(String(qty))}`}
                      className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-center text-sm font-semibold text-[#0B0C10] transition-colors hover:from-orange-500 hover:to-orange-600"
                    >
                      Continuar
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-sm font-semibold text-[#0B0C10] opacity-40"
                    >
                      Continuar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <BackToTop />
      </main>

      <SiteFooter />
    </>
  );
}