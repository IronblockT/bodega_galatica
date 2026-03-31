'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useAuth } from '@/components/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

type OrderRow = {
  id: string;
  user_id: string;
  status: string;
  subtotal_brl: number | string;
  shipping_brl: number | string;
  discount_brl: number | string;
  total_brl: number | string;
  currency: string;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  sku_key: string;
  qty: number;
  unit_price_brl: number | string;
  line_total_brl: number | string;
  item_snapshot: {
    title?: string;
    finish?: string;
    condition?: string;
    promo_type?: string;
    card_uid?: string;
    unit_price_brl?: number | string;
  } | null;
  created_at: string;
};

type OrderWithItems = OrderRow & {
  items: EnrichedOrderItemRow[];
  totalItems: number;
};

type EnrichedOrderItemRow = OrderItemRow & {
  card_title?: string | null;
  card_subtitle?: string | null;
};

type HistoryEntryItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  qty: number;
  unit_amount: number | string;
  total_amount: number | string;
  finish?: string | null;
  condition?: string | null;
  promo_type?: string | null;
};

type HistoryEntry = {
  id: string;
  kind: 'purchase' | 'sell_offer';
  status: string;
  created_at: string;
  total_amount: number | string;
  currency?: string | null;
  payout_type?: 'cash' | 'store_credit' | null;
  manual_review_required?: boolean;
  review_reason?: string | null;
  item_count: number;
  items: HistoryEntryItem[];
};

type BuylistOfferRow = {
  id: string;
  user_id: string;
  status: string;
  payout_type: 'cash' | 'store_credit';
  subtotal_amount: number | string;
  final_amount: number | string;
  cash_reserved_amount: number | string;
  manual_review_required: boolean;
  review_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type BuylistOfferItemRow = {
  id: string;
  offer_id: string;
  sku_key: string;
  pricing_rule_id: string | null;
  card_uid: string;
  finish: string;
  promo_type: string;
  condition: string;
  card_name_snapshot: string | null;
  quantity: number;
  sell_price_snapshot: number | string;
  buy_price_unit: number | string;
  buy_price_total: number | string;
  stock_on_hand_snapshot: number;
  stock_reserved_snapshot: number;
  payout_type: 'cash' | 'store_credit';
  manual_review_required: boolean;
  review_reason: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  card_title?: string | null;
  card_subtitle?: string | null;
};

type BuylistOfferWithItems = BuylistOfferRow & {
  items: BuylistOfferItemRow[];
  totalItems: number;
};

type SwuCardUiRow = {
  card_uid: string;
  title: string | null;
  subtitle: string | null;
};

const panelClass = 'rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl';
const topBtnBase =
  'rounded-full border px-4 py-2 text-xs font-semibold shadow-sm transition-colors';
const topBtnInactive =
  `${topBtnBase} border-black/15 bg-white text-black/80 hover:bg-black hover:text-white`;
const secondaryBtn =
  'rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors';

function formatMoneyBRL(value: number | string | null | undefined) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateBR(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function mapOrderStatusLabel(status: string | null | undefined) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'paid') return 'Pago';
  if (s === 'awaiting_payment') return 'Aguardando pagamento';
  if (s === 'reserved') return 'Reservado';
  if (s === 'cancelled') return 'Cancelado';
  if (s === 'draft') return 'Rascunho';
  return status ?? '—';
}

function mapSellOfferStatusLabel(status: string | null | undefined) {
  const s = String(status ?? '').toLowerCase();

  if (s === 'draft') return 'Rascunho';
  if (s === 'submitted') return 'Enviado';
  if (s === 'pending_review') return 'Em análise';
  if (s === 'approved') return 'Aprovado';
  if (s === 'rejected') return 'Rejeitado';
  if (s === 'received') return 'Recebido';
  if (s === 'paid') return 'Pago';
  if (s === 'cancelled') return 'Cancelado';

  return status ?? '—';
}

function mapHistoryStatusLabel(kind: HistoryEntry['kind'], status: string | null | undefined) {
  return kind === 'sell_offer' ? mapSellOfferStatusLabel(status) : mapOrderStatusLabel(status);
}

function mapPayoutTypeLabel(payoutType: 'cash' | 'store_credit' | null | undefined) {
  if (payoutType === 'cash') return 'Dinheiro';
  if (payoutType === 'store_credit') return 'Crédito na loja';
  return '—';
}

function statusBadgeClass(status: string | null | undefined) {
  const s = String(status ?? '').toLowerCase();

  if (s === 'paid') {
    return 'border-emerald-400/20 bg-emerald-500/15 text-emerald-200';
  }

  if (
    s === 'awaiting_payment' ||
    s === 'reserved' ||
    s === 'submitted' ||
    s === 'pending_review' ||
    s === 'approved' ||
    s === 'received'
  ) {
    return 'border-amber-400/20 bg-amber-500/15 text-amber-200';
  }

  if (s === 'cancelled' || s === 'rejected') {
    return 'border-rose-400/20 bg-rose-500/15 text-rose-200';
  }

  return 'border-white/10 bg-white/5 text-white/70';
}

function mapPurchaseFilterToStatuses(tipo: string | null): string[] | null {
  if (!tipo) return null;

  const t = tipo.toLowerCase();

  if (t === 'compras') {
    return ['paid'];
  }

  if (t === 'pendentes') {
    return ['awaiting_payment', 'reserved'];
  }

  if (t === 'concluidos') {
    return ['paid'];
  }

  if (t === 'cancelados') {
    return ['cancelled'];
  }

  if (t === 'vendas') {
    return [];
  }

  return null;
}

function mapSellFilterToStatuses(tipo: string | null): string[] | null {
  if (!tipo) return null;

  const t = tipo.toLowerCase();

  if (t === 'compras') {
    return [];
  }

  if (t === 'vendas') {
    return ['submitted', 'pending_review', 'approved', 'received', 'paid'];
  }

  if (t === 'pendentes') {
    return ['submitted', 'pending_review', 'approved', 'received'];
  }

  if (t === 'concluidos') {
    return ['paid'];
  }

  if (t === 'cancelados') {
    return ['cancelled', 'rejected'];
  }

  return null;
}

function filterChipClass(active: boolean) {
  if (active) {
    return `${topBtnBase} border-orange-400 bg-orange-500 text-[#0B0C10]`;
  }
  return topBtnInactive;
}

function MeusPedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipo = searchParams.get('tipo');

  const { isLoggedIn, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [sellOffers, setSellOffers] = useState<BuylistOfferWithItems[]>([]);

  const purchaseStatusFilter = useMemo(() => mapPurchaseFilterToStatuses(tipo), [tipo]);
  const sellStatusFilter = useMemo(() => mapSellFilterToStatuses(tipo), [tipo]);

  useEffect(() => {
    if (!isLoggedIn) router.replace('/entrar?next=/meus-pedidos');
  }, [isLoggedIn, router]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) {
        setOrders([]);
        setSellOffers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      if (purchaseStatusFilter && purchaseStatusFilter.length === 0) {
        setOrders([]);
      }

      let safeOrders: OrderRow[] = [];

      if (!purchaseStatusFilter || purchaseStatusFilter.length > 0) {
        let query = supabase
          .from('orders')
          .select('id, user_id, status, subtotal_brl, shipping_brl, discount_brl, total_brl, currency, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (purchaseStatusFilter?.length) {
          query = query.in('status', purchaseStatusFilter);
        } else {
          query = query.neq('status', 'draft');
        }

        const { data: orderRows, error: orderErr } = await query;

        if (!mounted) return;

        if (orderErr) {
          setErrorMsg(`Erro ao carregar pedidos: ${orderErr.message}`);
          setLoading(false);
          return;
        }

        safeOrders = (orderRows ?? []) as OrderRow[];
      }

      if (safeOrders.length === 0) {
        setOrders([]);
      } else {
        const orderIds = safeOrders.map((o) => o.id);

        const { data: itemRows, error: itemErr } = await supabase
          .from('order_items')
          .select('id, order_id, sku_key, qty, unit_price_brl, line_total_brl, item_snapshot, created_at')
          .in('order_id', orderIds)
          .order('created_at', { ascending: true });

        if (!mounted) return;

        if (itemErr) {
          setErrorMsg(`Erro ao carregar itens dos pedidos: ${itemErr.message}`);
          setLoading(false);
          return;
        }

        const safeItems = (itemRows ?? []) as OrderItemRow[];

        const uniquePurchaseCardUids = Array.from(
          new Set(
            safeItems
              .map((item) => item.item_snapshot?.card_uid)
              .filter(Boolean)
          )
        ) as string[];

        let purchaseCatalogByCardUid = new Map<string, SwuCardUiRow>();

        if (uniquePurchaseCardUids.length > 0) {
          const { data: purchaseCatalogRows, error: purchaseCatalogErr } = await supabase
            .from('swu_cards_ui')
            .select('card_uid, title, subtitle')
            .in('card_uid', uniquePurchaseCardUids);

          if (!mounted) return;

          if (purchaseCatalogErr) {
            setErrorMsg(`Erro ao carregar catálogo das compras: ${purchaseCatalogErr.message}`);
            setLoading(false);
            return;
          }

          purchaseCatalogByCardUid = new Map(
            ((purchaseCatalogRows ?? []) as SwuCardUiRow[]).map((card) => [card.card_uid, card])
          );
        }

        const enrichedPurchaseItems: EnrichedOrderItemRow[] = safeItems.map((item) => {
          const cardUid = item.item_snapshot?.card_uid ?? null;
          const card = cardUid ? purchaseCatalogByCardUid.get(cardUid) : undefined;

          return {
            ...item,
            card_title: card?.title ?? item.item_snapshot?.title ?? null,
            card_subtitle: card?.subtitle ?? null,
          };
        });

        const itemsByOrder = new Map<string, EnrichedOrderItemRow[]>();

        for (const item of enrichedPurchaseItems) {
          const arr = itemsByOrder.get(item.order_id) ?? [];
          arr.push(item);
          itemsByOrder.set(item.order_id, arr);
        }

        const combined: OrderWithItems[] = safeOrders.map((order) => {
          const items = itemsByOrder.get(order.id) ?? [];
          const totalItems = items.reduce((acc, item) => acc + Number(item.qty ?? 0), 0);

          return {
            ...order,
            items,
            totalItems,
          };
        });

        setOrders(combined);
      }

      let safeSellOffers: BuylistOfferRow[] = [];

      if (!sellStatusFilter || sellStatusFilter.length > 0) {
        let sellQuery = supabase
          .from('buylist_offers')
          .select(
            'id, user_id, status, payout_type, subtotal_amount, final_amount, cash_reserved_amount, manual_review_required, review_reason, notes, created_at, updated_at'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (sellStatusFilter?.length) {
          sellQuery = sellQuery.in('status', sellStatusFilter);
        } else {
          sellQuery = sellQuery.neq('status', 'draft');
        }

        const { data: sellRows, error: sellErr } = await sellQuery;

        if (!mounted) return;

        if (sellErr) {
          setErrorMsg(`Erro ao carregar vendas para a loja: ${sellErr.message}`);
          setLoading(false);
          return;
        }

        safeSellOffers = (sellRows ?? []) as BuylistOfferRow[];
      }

      if (safeSellOffers.length === 0) {
        setSellOffers([]);
      } else {
        const offerIds = safeSellOffers.map((offer) => offer.id);

        const { data: sellItemRows, error: sellItemErr } = await supabase
          .from('buylist_offer_items')
          .select(
            'id, offer_id, sku_key, pricing_rule_id, card_uid, finish, promo_type, condition, card_name_snapshot, quantity, sell_price_snapshot, buy_price_unit, buy_price_total, stock_on_hand_snapshot, stock_reserved_snapshot, payout_type, manual_review_required, review_reason, status, created_at, updated_at'
          )
          .in('offer_id', offerIds)
          .order('created_at', { ascending: true });

        if (!mounted) return;

        if (sellItemErr) {
          setErrorMsg(`Erro ao carregar itens das vendas para a loja: ${sellItemErr.message}`);
          setLoading(false);
          return;
        }

        const safeSellItems = (sellItemRows ?? []) as BuylistOfferItemRow[];

        const uniqueCardUids = Array.from(
          new Set(
            safeSellItems
              .map((item) => item.card_uid)
              .filter(Boolean)
          )
        );

        let catalogByCardUid = new Map<string, SwuCardUiRow>();

        if (uniqueCardUids.length > 0) {
          const { data: catalogRows, error: catalogErr } = await supabase
            .from('swu_cards_ui')
            .select('card_uid, title, subtitle')
            .in('card_uid', uniqueCardUids);

          if (!mounted) return;

          if (catalogErr) {
            setErrorMsg(`Erro ao carregar catálogo das cartas: ${catalogErr.message}`);
            setLoading(false);
            return;
          }

          catalogByCardUid = new Map(
            ((catalogRows ?? []) as SwuCardUiRow[]).map((card) => [card.card_uid, card])
          );
        }

        const enrichedSellItems: BuylistOfferItemRow[] = safeSellItems.map((item) => {
          const card = catalogByCardUid.get(item.card_uid);

          return {
            ...item,
            card_title: card?.title ?? null,
            card_subtitle: card?.subtitle ?? null,
          };
        });

        const itemsByOffer = new Map<string, BuylistOfferItemRow[]>();

        for (const item of enrichedSellItems) {
          const arr = itemsByOffer.get(item.offer_id) ?? [];
          arr.push(item);
          itemsByOffer.set(item.offer_id, arr);
        }

        const combinedSellOffers: BuylistOfferWithItems[] = safeSellOffers.map((offer) => {
          const items = itemsByOffer.get(offer.id) ?? [];
          const totalItems = items.reduce((acc, item) => acc + Number(item.quantity ?? 0), 0);

          return {
            ...offer,
            items,
            totalItems,
          };
        });

        setSellOffers(combinedSellOffers);
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [user?.id, purchaseStatusFilter, sellStatusFilter]);

  const pageTitle = useMemo(() => {
    if (tipo === 'compras') return 'Minhas Compras';
    if (tipo === 'vendas') return 'Minhas Vendas para a Loja';
    if (tipo === 'pendentes') return 'Operações Pendentes';
    if (tipo === 'concluidos') return 'Operações Concluídas';
    if (tipo === 'cancelados') return 'Operações Canceladas';
    return 'Meus Pedidos e Vendas';
  }, [tipo]);

  const historyEntries = useMemo<HistoryEntry[]>(() => {
    const purchaseEntries: HistoryEntry[] = orders.map((order) => ({
      id: order.id,
      kind: 'purchase',
      status: order.status,
      created_at: order.created_at,
      total_amount: order.total_brl,
      currency: order.currency,
      item_count: order.totalItems,
      items: order.items.map((item) => ({
        id: item.id,
        title: item.card_title || item.item_snapshot?.title || item.sku_key,
        subtitle: item.card_subtitle ?? null,
        qty: Number(item.qty ?? 0),
        unit_amount: item.unit_price_brl,
        total_amount: item.line_total_brl,
        finish: item.item_snapshot?.finish ?? null,
        condition: item.item_snapshot?.condition ?? null,
        promo_type: item.item_snapshot?.promo_type ?? null,
      })),
    }));

    const sellEntries: HistoryEntry[] = sellOffers.map((offer) => ({
      id: offer.id,
      kind: 'sell_offer',
      status: offer.status,
      created_at: offer.created_at,
      total_amount: offer.final_amount,
      payout_type: offer.payout_type,
      manual_review_required: offer.manual_review_required,
      review_reason: offer.review_reason,
      item_count: offer.totalItems,
      items: offer.items.map((item) => ({
        id: item.id,
        title:
          item.card_title ||
          item.card_name_snapshot ||
          item.sku_key,
        subtitle: item.card_subtitle ?? null,
        qty: Number(item.quantity ?? 0),
        unit_amount: item.buy_price_unit,
        total_amount: item.buy_price_total,
        finish: item.finish ?? null,
        condition: item.condition ?? null,
        promo_type: item.promo_type ?? null,
      })),
    }));

    return [...purchaseEntries, ...sellEntries].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }, [orders, sellOffers]);

  const summary = useMemo(() => {
    const totalOperations = historyEntries.length;
    const totalItems = historyEntries.reduce((acc, entry) => acc + entry.item_count, 0);
    const totalValue = historyEntries.reduce((acc, entry) => {
      const n = typeof entry.total_amount === 'string' ? Number(entry.total_amount) : Number(entry.total_amount ?? 0);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);

    return { totalOperations, totalItems, totalValue };
  }, [historyEntries]);

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              {pageTitle}
            </h1>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-lg text-black/65">
                Acompanhe suas compras, vendas para a loja e o status de cada operação.
              </p>

              <div className="flex flex-wrap gap-2">
                <Link href="/minha-conta" className={topBtnInactive}>
                  Minha conta
                </Link>
                <Link href="/meus-pedidos" className={filterChipClass(!tipo)}>
                  Todos
                </Link>
                <Link href="/meus-pedidos?tipo=compras" className={filterChipClass(tipo === 'compras')}>
                  Compras
                </Link>
                <Link href="/meus-pedidos?tipo=vendas" className={filterChipClass(tipo === 'vendas')}>
                  Vendas
                </Link>
                <Link href="/meus-pedidos?tipo=pendentes" className={filterChipClass(tipo === 'pendentes')}>
                  Pendentes
                </Link>
                <Link href="/meus-pedidos?tipo=concluidos" className={filterChipClass(tipo === 'concluidos')}>
                  Concluídos
                </Link>
                <Link href="/meus-pedidos?tipo=cancelados" className={filterChipClass(tipo === 'cancelados')}>
                  Cancelados
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl px-5 py-4 min-h-[96px] flex flex-col justify-center">
              <div className="text-xs uppercase tracking-wide text-white/50">Operações</div>
              <div className="mt-2 text-3xl font-semibold leading-none text-white">
                {summary.totalOperations}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl px-5 py-4 min-h-[96px] flex flex-col justify-center">
              <div className="text-xs uppercase tracking-wide text-white/50">Itens</div>
              <div className="mt-2 text-3xl font-semibold leading-none text-white">
                {summary.totalItems}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl px-5 py-4 min-h-[96px] flex flex-col justify-center">
              <div className="text-xs uppercase tracking-wide text-white/50">Valor total</div>
              <div className="mt-2 text-3xl font-semibold leading-none text-orange-300">
                {formatMoneyBRL(summary.totalValue)}
              </div>
            </div>
          </div>          

          <div className={panelClass}>
            <div className="p-6">
              {errorMsg ? (
                <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-rose-200">
                  {errorMsg}
                </div>
              ) : null}

              {loading ? (
                <div className="text-sm text-white/60">Carregando operações…</div>
              ) : historyEntries.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-4 text-sm text-white/60">
                  Nenhuma operação encontrada para este filtro.
                </div>
              ) : (
                <div className="space-y-6">
                  {historyEntries.map((entry) => (
                    <div
                      key={`${entry.kind}-${entry.id}`}
                      className="rounded-2xl border border-white/10 bg-black/50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-white/45">
                              {entry.kind === 'sell_offer' ? 'Oferta de venda' : 'Pedido'}
                            </div>
                            <div className="mt-1 font-mono text-sm text-white/85 break-all">
                              {entry.id}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={[
                                'inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold',
                                statusBadgeClass(entry.status),
                              ].join(' ')}
                            >
                              {mapHistoryStatusLabel(entry.kind, entry.status)}
                            </span>

                            {entry.kind === 'sell_offer' ? (
                              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80">
                                {mapPayoutTypeLabel(entry.payout_type)}
                              </span>
                            ) : null}

                            <span className="text-xs text-white/50">
                              {formatDateBR(entry.created_at)}
                            </span>
                          </div>

                          {entry.kind === 'sell_offer' && entry.manual_review_required ? (
                            <div className="text-xs text-amber-200">
                              Revisão manual necessária
                            </div>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm lg:min-w-[320px]">
                          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                            <div className="text-xs text-white/45">Itens</div>
                            <div className="mt-1 font-semibold text-white/90">{entry.item_count}</div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                            <div className="text-xs text-white/45">
                              {entry.kind === 'sell_offer' ? 'Valor da oferta' : 'Total'}
                            </div>
                            <div className="mt-1 font-semibold text-orange-300">
                              {formatMoneyBRL(entry.total_amount)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-white/10 pt-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/55">
                          {entry.kind === 'sell_offer' ? 'Cartas da oferta' : 'Itens do pedido'}
                        </div>

                        {entry.items.length === 0 ? (
                          <div className="text-xs text-white/50">
                            {entry.kind === 'sell_offer'
                              ? 'Nenhum item encontrado para esta oferta.'
                              : 'Nenhum item encontrado para este pedido.'}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {entry.items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-white/90">
                                      {item.title}
                                      {item.subtitle ? ` — ${item.subtitle}` : ''}
                                    </div>

                                    <div className="mt-1 text-xs text-white/55">
                                      {[item.promo_type, item.finish, item.condition]
                                        .filter(Boolean)
                                        .join(' • ') || '—'}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-4 text-right text-xs text-white/70 lg:min-w-[280px]">
                                    <div>
                                      <div className="text-white/45">Qtd</div>
                                      <div className="mt-1 text-white/85">{item.qty}</div>
                                    </div>

                                    <div>
                                      <div className="text-white/45">Unitário</div>
                                      <div className="mt-1 text-white/85">
                                        {formatMoneyBRL(item.unit_amount)}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-white/45">Subtotal</div>
                                      <div className="mt-1 font-semibold text-orange-300">
                                        {formatMoneyBRL(item.total_amount)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {entry.kind === 'purchase' ? (
                        <div className="mt-4 flex justify-end">
                          <Link href="/cartas" className={secondaryBtn}>
                            Comprar mais
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}

export default function MeusPedidosPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F6F0E6]" />}>
      <MeusPedidosContent />
    </Suspense>
  );
}