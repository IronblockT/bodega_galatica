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
  items: OrderItemRow[];
  totalItems: number;
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

function statusBadgeClass(status: string | null | undefined) {
  const s = String(status ?? '').toLowerCase();

  if (s === 'paid') {
    return 'border-emerald-400/20 bg-emerald-500/15 text-emerald-200';
  }

  if (s === 'awaiting_payment' || s === 'reserved') {
    return 'border-amber-400/20 bg-amber-500/15 text-amber-200';
  }

  if (s === 'cancelled') {
    return 'border-rose-400/20 bg-rose-500/15 text-rose-200';
  }

  return 'border-white/10 bg-white/5 text-white/70';
}

function mapFilterToStatuses(tipo: string | null): string[] | null {
  if (!tipo) return null;
  const t = tipo.toLowerCase();

  if (t === 'compras') {
    return ['paid'];
  }

  if (t === 'pendentes') {
    return ['awaiting_payment', 'reserved'];
  }

  if (t === 'cancelados') {
    return ['cancelled'];
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

  const statusFilter = useMemo(() => mapFilterToStatuses(tipo), [tipo]);

  useEffect(() => {
    if (!isLoggedIn) router.replace('/entrar?next=/meus-pedidos');
  }, [isLoggedIn, router]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      let query = supabase
        .from('orders')
        .select('id, user_id, status, subtotal_brl, shipping_brl, discount_brl, total_brl, currency, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter?.length) {
        query = query.in('status', statusFilter);
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

      const safeOrders = (orderRows ?? []) as OrderRow[];

      if (safeOrders.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

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
      const itemsByOrder = new Map<string, OrderItemRow[]>();

      for (const item of safeItems) {
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
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [user?.id, statusFilter]);

  const pageTitle = useMemo(() => {
    if (tipo === 'compras') return 'Meus Pedidos de Compra';
    if (tipo === 'pendentes') return 'Pedidos Pendentes';
    if (tipo === 'cancelados') return 'Pedidos Cancelados';
    return 'Meus Pedidos';
  }, [tipo]);

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalItems = orders.reduce((acc, order) => acc + order.totalItems, 0);
    const totalValue = orders.reduce((acc, order) => {
      const n = typeof order.total_brl === 'string' ? Number(order.total_brl) : Number(order.total_brl ?? 0);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);

    return { totalOrders, totalItems, totalValue };
  }, [orders]);

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
                Acompanhe seus pedidos, status e itens comprados.
              </p>

              <div className="flex flex-wrap gap-2">
                <Link href="/minha-conta" className={topBtnInactive}>
                  Minha conta
                </Link>
                <Link href="/meus-pedidos" className={filterChipClass(!tipo)}>
                  Todos
                </Link>
                <Link href="/meus-pedidos?tipo=compras" className={filterChipClass(tipo === 'compras')}>
                  Pagos
                </Link>
                <Link href="/meus-pedidos?tipo=pendentes" className={filterChipClass(tipo === 'pendentes')}>
                  Pendentes
                </Link>
                <Link href="/meus-pedidos?tipo=cancelados" className={filterChipClass(tipo === 'cancelados')}>
                  Cancelados
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl px-5 py-4 min-h-[96px] flex flex-col justify-center">
              <div className="text-xs uppercase tracking-wide text-white/50">Pedidos</div>
              <div className="mt-2 text-3xl font-semibold leading-none text-white">
                {summary.totalOrders}
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
                <div className="text-sm text-white/60">Carregando pedidos…</div>
              ) : orders.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-4 text-sm text-white/60">
                  Nenhum pedido encontrado para este filtro.
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-white/10 bg-black/50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-white/45">Pedido</div>
                            <div className="mt-1 font-mono text-sm text-white/85 break-all">
                              {order.id}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={[
                                'inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold',
                                statusBadgeClass(order.status),
                              ].join(' ')}
                            >
                              {mapOrderStatusLabel(order.status)}
                            </span>

                            <span className="text-xs text-white/50">
                              {formatDateBR(order.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm lg:min-w-[320px]">
                          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                            <div className="text-xs text-white/45">Itens</div>
                            <div className="mt-1 font-semibold text-white/90">{order.totalItems}</div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                            <div className="text-xs text-white/45">Total</div>
                            <div className="mt-1 font-semibold text-orange-300">
                              {formatMoneyBRL(order.total_brl)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-white/10 pt-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/55">
                          Itens do pedido
                        </div>

                        {order.items.length === 0 ? (
                          <div className="text-xs text-white/50">
                            Nenhum item encontrado para este pedido.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-white/90">
                                      {item.item_snapshot?.title ?? item.sku_key}
                                    </div>

                                    <div className="mt-1 text-xs text-white/55">
                                      {[item.item_snapshot?.finish, item.item_snapshot?.condition]
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
                                        {formatMoneyBRL(item.unit_price_brl)}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-white/45">Subtotal</div>
                                      <div className="mt-1 font-semibold text-orange-300">
                                        {formatMoneyBRL(item.line_total_brl)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Link href="/cartas" className={secondaryBtn}>
                          Comprar mais
                        </Link>
                      </div>
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