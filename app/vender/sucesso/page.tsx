import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";

const SHIP_TO_NAME = "Bodega Galática";
const SHIP_TO_ADDRESS_LINE_1 = "Alameda Pelotas 397";
const SHIP_TO_ADDRESS_LINE_2 = "Santana de Parnaiba - São Paulo - 06543-210";
const SHIP_TO_COUNTRY = "Brasil";
const SUPPORT_CONTACT = "Contato@bgexchange.com.br";

type OfferRow = {
  id: string;
  status: string;
  payout_type: string;
  subtotal_amount: number | string | null;
  final_amount: number | string | null;
  cash_reserved_amount: number | string | null;
  manual_review_required: boolean | null;
  review_reason: string | null;
  source_flow: string | null;
  checkout_group_id: string | null;
  created_at: string | null;
};

type OfferItemRow = {
  id: string;
  offer_id: string;
  status: string;
  sku_key: string;
  card_uid: string;
  finish: string;
  promo_type: string;
  condition: string;
  quantity: number;
  buy_price_unit: number | string | null;
  buy_price_total: number | string | null;
  payout_type: string;
  manual_review_required: boolean | null;
  review_reason: string | null;
};

type CardRow = {
  card_uid: string;
  expansion_code: string | null;
  title: string | null;
  subtitle: string | null;
  image_front_url: string | null;
  card_type_label: string | null;
  rarity_label: string | null;
};

function formatMoneyBRL(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(n)) {
    return "—";
  }

  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function payoutLabel(payoutType: string | null | undefined) {
  if (payoutType === "store_credit") return "Crédito na loja";
  if (payoutType === "cash") return "Dinheiro / Pix";
  return "—";
}

function statusLabel(status: string | null | undefined) {
  if (status === "pending_review") return "Em revisão";
  if (status === "pending") return "Pendente";
  if (status === "submitted") return "Enviada";
  if (status === "approved") return "Aprovada";
  if (status === "rejected") return "Rejeitada";
  if (status === "received") return "Recebida";
  if (status === "paid") return "Paga";
  if (status === "cancelled") return "Cancelada";
  return status || "—";
}

function getCardName(card: CardRow | undefined, item: OfferItemRow) {
  if (!card?.title) return item.card_uid;

  return card.subtitle ? `${card.title}, ${card.subtitle}` : card.title;
}

function getGroupStatus(offers: OfferRow[]) {
  if (offers.some((offer) => offer.status === "pending_review")) {
    return "Em revisão";
  }

  if (offers.every((offer) => offer.status === "submitted")) {
    return "Enviada";
  }

  return "Recebida";
}

function getGroupTotal(offers: OfferRow[]) {
  return offers.reduce((acc, offer) => {
    const n =
      typeof offer.final_amount === "string"
        ? Number(offer.final_amount)
        : offer.final_amount;

    return acc + (Number.isFinite(n) ? Number(n) : 0);
  }, 0);
}

function groupItemsByOffer(items: OfferItemRow[]) {
  const map = new Map<string, OfferItemRow[]>();

  for (const item of items) {
    const existing = map.get(item.offer_id) ?? [];
    existing.push(item);
    map.set(item.offer_id, existing);
  }

  return map;
}

async function loadOfferData({
  offerId,
  checkoutGroupId,
}: {
  offerId: string;
  checkoutGroupId: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      offers: [] as OfferRow[],
      items: [] as OfferItemRow[],
      cardsByUid: new Map<string, CardRow>(),
      error: "Variáveis de ambiente do Supabase não configuradas no servidor.",
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let offersQuery = supabaseAdmin
    .from("buylist_offers")
    .select(
      "id,status,payout_type,subtotal_amount,final_amount,cash_reserved_amount,manual_review_required,review_reason,source_flow,checkout_group_id,created_at"
    )
    .order("created_at", { ascending: true });

  if (checkoutGroupId) {
    offersQuery = offersQuery.eq("checkout_group_id", checkoutGroupId);
  } else if (offerId) {
    offersQuery = offersQuery.eq("id", offerId);
  } else {
    return {
      offers: [] as OfferRow[],
      items: [] as OfferItemRow[],
      cardsByUid: new Map<string, CardRow>(),
      error: null,
    };
  }

  const { data: offersData, error: offersError } = await offersQuery;

  if (offersError) {
    return {
      offers: [] as OfferRow[],
      items: [] as OfferItemRow[],
      cardsByUid: new Map<string, CardRow>(),
      error: offersError.message,
    };
  }

  const offers = (offersData ?? []) as OfferRow[];
  const offerIds = offers.map((offer) => offer.id);

  if (offerIds.length === 0) {
    return {
      offers,
      items: [] as OfferItemRow[],
      cardsByUid: new Map<string, CardRow>(),
      error: null,
    };
  }

  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from("buylist_offer_items")
    .select(
      "id,offer_id,status,sku_key,card_uid,finish,promo_type,condition,quantity,buy_price_unit,buy_price_total,payout_type,manual_review_required,review_reason"
    )
    .in("offer_id", offerIds)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return {
      offers,
      items: [] as OfferItemRow[],
      cardsByUid: new Map<string, CardRow>(),
      error: itemsError.message,
    };
  }

  const items = (itemsData ?? []) as OfferItemRow[];
  const cardUids = Array.from(new Set(items.map((item) => item.card_uid))).filter(
    Boolean
  );

  const cardsByUid = new Map<string, CardRow>();

  if (cardUids.length > 0) {
    const { data: cardsData } = await supabaseAdmin
      .from("swu_cards_ui")
      .select(
        "card_uid,expansion_code,title,subtitle,image_front_url,card_type_label,rarity_label"
      )
      .in("card_uid", cardUids);

    for (const card of (cardsData ?? []) as CardRow[]) {
      cardsByUid.set(card.card_uid, card);
    }
  }

  return {
    offers,
    items,
    cardsByUid,
    error: null,
  };
}

export default async function VenderSucessoPage({
  searchParams,
}: {
  searchParams: Promise<{
    offer_id?: string;
    payout_type?: string;
    checkout_group_id?: string;
  }>;
}) {
  const sp = await searchParams;

  const offerId = String(sp?.offer_id ?? "").trim();
  const checkoutGroupId = String(sp?.checkout_group_id ?? "").trim();
  const fallbackPayoutType = String(sp?.payout_type ?? "").trim();

  const { offers, items, cardsByUid, error } = await loadOfferData({
    offerId,
    checkoutGroupId,
  });

  const itemsByOffer = groupItemsByOffer(items);
  const firstOffer = offers[0] ?? null;
  const displayCheckoutGroupId =
    checkoutGroupId || firstOffer?.checkout_group_id || "";
  const groupTotal = getGroupTotal(offers);
  const groupStatus = offers.length > 0 ? getGroupStatus(offers) : "—";

  const legacyPayoutLabel =
    fallbackPayoutType === "store_credit"
      ? "Crédito na loja"
      : fallbackPayoutType === "cash"
      ? "Dinheiro / Pix"
      : "—";

  return (
    <>
      <main className="relative min-h-screen bg-[#F6F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10]/95 shadow-2xl backdrop-blur">
            <div className="sunset-line" />

            <div className="p-8 md:p-10">
              <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                Venda enviada
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Sua venda foi registrada com sucesso
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">
                Recebemos sua solicitação de venda. Agora o próximo passo é
                preparar as cartas corretamente e enviar para a Bodega Galática.
                Depois do recebimento e conferência, seguimos com a conclusão da
                sua oferta.
              </p>

              {error ? (
                <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100">
                  A venda foi enviada, mas não foi possível carregar todos os
                  detalhes agora. Detalhe: {error}
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/75">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Grupo da venda
                  </div>
                  <div className="mt-2 break-all font-mono text-white">
                    {displayCheckoutGroupId || offerId || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/75">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Status
                  </div>
                  <div className="mt-2 text-white">{groupStatus}</div>
                </div>

                <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-5 text-sm text-orange-100">
                  <div className="text-xs uppercase tracking-wide text-orange-200/70">
                    Total estimado
                  </div>
                  <div className="mt-2 text-xl font-semibold text-orange-200">
                    {offers.length > 0 ? formatMoneyBRL(groupTotal) : "—"}
                  </div>
                </div>
              </div>

              {offers.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
                  <h2 className="text-xl font-semibold text-white">
                    Dados da oferta
                  </h2>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/75">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Offer ID
                      </div>
                      <div className="mt-2 break-all font-mono text-white">
                        {offerId || "—"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/75">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Forma de recebimento
                      </div>
                      <div className="mt-2 text-white">{legacyPayoutLabel}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  {offers.map((offer, index) => {
                    const offerItems = itemsByOffer.get(offer.id) ?? [];

                    return (
                      <section
                        key={offer.id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-black/40"
                      >
                        <div className="p-6">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                                Oferta {index + 1}
                              </div>

                              <h2 className="mt-4 text-xl font-semibold text-white">
                                {payoutLabel(offer.payout_type)}
                              </h2>

                              <p className="mt-2 text-sm text-white/55">
                                Status: {statusLabel(offer.status)}
                              </p>

                              <p className="mt-1 break-all text-xs text-white/40">
                                ID da oferta:{" "}
                                <span className="font-mono">{offer.id}</span>
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-right">
                              <div className="text-xs uppercase tracking-wide text-white/45">
                                Total
                              </div>
                              <div className="mt-1 text-xl font-semibold text-orange-300">
                                {formatMoneyBRL(offer.final_amount)}
                              </div>
                            </div>
                          </div>

                          {offer.manual_review_required ? (
                            <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                              Esta oferta entrou em revisão manual antes da
                              confirmação final.
                            </div>
                          ) : null}

                          <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                            {offerItems.length === 0 ? (
                              <div className="p-4 text-sm text-white/55">
                                Nenhum item encontrado para esta oferta.
                              </div>
                            ) : (
                              offerItems.map((item) => {
                                const card = cardsByUid.get(item.card_uid);

                                return (
                                  <div key={item.id} className="p-4">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold text-white">
                                          {getCardName(card, item)}
                                        </div>

                                        <div className="mt-1 text-xs text-white/55">
                                          {card?.card_type_label ?? "—"} •{" "}
                                          {card?.expansion_code ?? "—"} •{" "}
                                          {item.finish} • {item.promo_type} •{" "}
                                          {item.condition}
                                        </div>

                                        <div className="mt-2 text-xs text-white/45">
                                          Status do item:{" "}
                                          {statusLabel(item.status)}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[260px]">
                                        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                          <div className="text-xs text-white/45">
                                            Quantidade
                                          </div>
                                          <div className="mt-1 font-semibold text-white">
                                            {item.quantity}
                                          </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                          <div className="text-xs text-white/45">
                                            Total
                                          </div>
                                          <div className="mt-1 font-semibold text-orange-300">
                                            {formatMoneyBRL(
                                              item.buy_price_total
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Como funciona a partir de agora
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                  <p>
                    <span className="font-semibold text-white">1.</span> Sua
                    venda foi registrada no sistema com os dados das cartas,
                    quantidade e forma de recebimento escolhida.
                  </p>

                  <p>
                    <span className="font-semibold text-white">2.</span> Você
                    deve preparar as cartas com proteção adequada e enviar para o
                    endereço da Bodega Galática.
                  </p>

                  <p>
                    <span className="font-semibold text-white">3.</span> Quando
                    as cartas chegarem, elas serão conferidas quanto a condição,
                    autenticidade, acabamento e conformidade com a oferta criada.
                  </p>

                  <p>
                    <span className="font-semibold text-white">4.</span> Se as
                    cartas estiverem de acordo com o esperado, a venda seguirá
                    para conclusão e pagamento ou crédito na loja, conforme a
                    opção escolhida.
                  </p>

                  <p>
                    <span className="font-semibold text-white">5.</span> Caso
                    haja divergência relevante de condição, quantidade ou outro
                    ponto importante, a oferta poderá passar por revisão antes da
                    finalização.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Como preparar suas cartas para envio
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                  <p>
                    <span className="font-semibold text-white">
                      Proteção individual:
                    </span>{" "}
                    coloque cada carta primeiro em um sleeve de boa qualidade.
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      Proteção rígida:
                    </span>{" "}
                    depois do sleeve, use top loader, card saver ou outra
                    proteção rígida equivalente para evitar dobras e pressão.
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      Fixação segura:
                    </span>{" "}
                    se enviar mais de uma carta, organize tudo de forma que as
                    cartas não fiquem soltas dentro da embalagem.
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      Evite contato com umidade:
                    </span>{" "}
                    sempre que possível, use proteção adicional como saquinho
                    plástico, zip bag ou camada protetora equivalente.
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      Embalagem externa:
                    </span>{" "}
                    use envelope reforçado ou caixa pequena, conforme a
                    quantidade e valor das cartas. Cartas de maior valor devem
                    receber proteção extra.
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      Identificação:
                    </span>{" "}
                    inclua dentro da embalagem uma identificação com seu nome e,
                    se possível, o ID da oferta ou grupo da venda para facilitar
                    a conferência.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Endereço para envio
                </h2>

                <div className="mt-4 space-y-1 text-sm leading-7 text-orange-100">
                  <div className="font-semibold">{SHIP_TO_NAME}</div>
                  <div>{SHIP_TO_ADDRESS_LINE_1}</div>
                  <div>{SHIP_TO_ADDRESS_LINE_2}</div>
                  <div>{SHIP_TO_COUNTRY}</div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
                <h2 className="text-xl font-semibold text-white">
                  Dicas importantes
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                  <p>
                    Tire fotos das cartas e da embalagem antes do envio,
                    principalmente em casos de cartas de maior valor.
                  </p>

                  <p>
                    Sempre que possível, utilize uma modalidade de envio com
                    rastreio.
                  </p>

                  <p>
                    Guarde o comprovante de postagem até a conclusão da sua
                    venda.
                  </p>

                  <p>
                    Em caso de dúvida sobre embalagem, envio ou conferência,
                    entre em contato com a equipe da Bodega Galática antes de
                    postar.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
                <h2 className="text-xl font-semibold text-white">Suporte</h2>

                <p className="mt-4 text-sm leading-7 text-white/70">
                  Canal de suporte para dúvidas sobre envio, conferência e
                  andamento da venda:
                </p>

                <div className="mt-3 text-sm font-semibold text-white">
                  {SUPPORT_CONTACT}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/vender"
                  className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-center text-sm font-semibold text-[#0B0C10] transition-colors hover:from-orange-500 hover:to-orange-600"
                >
                  Fazer nova venda
                </Link>

                <Link
                  href="/"
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  Voltar para a home
                </Link>
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