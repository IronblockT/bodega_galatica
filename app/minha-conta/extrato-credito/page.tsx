'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useAuth } from '@/components/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

type StoreCreditRow = {
  user_id: string;
  balance_brl: number | string;
  created_at: string;
  updated_at: string;
};

type StoreCreditLedgerRow = {
  id: string;
  user_id: string;
  entry_type: 'credit' | 'debit' | 'adjustment';
  source_type: 'buylist' | 'checkout' | 'admin' | 'refund';
  source_id: string | null;
  amount_brl: number | string;
  balance_after_brl: number | string;
  description: string | null;
  created_at: string;
};

const panelClass = 'rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur';
const secondaryBtn =
  'rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors';
const topSecondaryBtn =
  'rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black/80 shadow-sm hover:bg-black hover:text-white transition-colors';

function formatMoneyBRL(value: number | string | null | undefined) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateTimeBR(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
}

function mapEntryTypeLabel(entryType: StoreCreditLedgerRow['entry_type']) {
  if (entryType === 'credit') return 'Entrada';
  if (entryType === 'debit') return 'Saída';
  return 'Ajuste';
}

function mapSourceTypeLabel(sourceType: StoreCreditLedgerRow['source_type']) {
  if (sourceType === 'buylist') return 'Buylist';
  if (sourceType === 'checkout') return 'Checkout';
  if (sourceType === 'admin') return 'Admin';
  if (sourceType === 'refund') return 'Estorno';
  return sourceType;
}

function amountClass(amount: number | string) {
  const n = typeof amount === 'string' ? Number(amount) : Number(amount ?? 0);
  if (Number.isFinite(n) && n > 0) return 'text-emerald-300';
  if (Number.isFinite(n) && n < 0) return 'text-rose-300';
  return 'text-white/85';
}

export default function ExtratoCreditoPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [storeCredit, setStoreCredit] = useState<StoreCreditRow | null>(null);
  const [ledgerRows, setLedgerRows] = useState<StoreCreditLedgerRow[]>([]);

  useEffect(() => {
    if (!isLoggedIn) router.replace('/entrar?next=/minha-conta/extrato-credito');
  }, [isLoggedIn, router]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) return;

      setLoading(true);
      setErrorMsg(null);

      const { data: creditRow, error: creditErr } = await supabase
        .from('user_store_credit')
        .select('user_id, balance_brl, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (creditErr) {
        setErrorMsg(`Erro ao carregar saldo: ${creditErr.message}`);
        setLoading(false);
        return;
      }

      setStoreCredit((creditRow as StoreCreditRow) ?? null);

      const { data: ledgerData, error: ledgerErr } = await supabase
        .from('user_store_credit_ledger')
        .select(
          'id, user_id, entry_type, source_type, source_id, amount_brl, balance_after_brl, description, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (ledgerErr) {
        setErrorMsg(`Erro ao carregar extrato: ${ledgerErr.message}`);
        setLoading(false);
        return;
      }

      setLedgerRows((ledgerData ?? []) as StoreCreditLedgerRow[]);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const summary = useMemo(() => {
    const totalCredits = ledgerRows.reduce((acc, row) => {
      const n = typeof row.amount_brl === 'string' ? Number(row.amount_brl) : Number(row.amount_brl ?? 0);
      return Number.isFinite(n) && n > 0 ? acc + n : acc;
    }, 0);

    const totalDebits = ledgerRows.reduce((acc, row) => {
      const n = typeof row.amount_brl === 'string' ? Number(row.amount_brl) : Number(row.amount_brl ?? 0);
      return Number.isFinite(n) && n < 0 ? acc + Math.abs(n) : acc;
    }, 0);

    return {
      totalCredits,
      totalDebits,
      currentBalance:
        typeof storeCredit?.balance_brl === 'string'
          ? Number(storeCredit.balance_brl)
          : Number(storeCredit?.balance_brl ?? 0),
    };
  }, [ledgerRows, storeCredit]);

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              Extrato de Crédito
            </h1>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-lg text-black/65">
                Acompanhe entradas, saídas e saldo do seu crédito em conta.
              </p>

              <div className="flex gap-2">
                <Link href="/minha-conta" className={topSecondaryBtn}>
                  Voltar para Minha Conta
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B0C10] p-6 md:p-8">
            {errorMsg ? (
              <div className="mb-6 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-rose-200 backdrop-blur">
                {errorMsg}
              </div>
            ) : null}

            {loading ? (
              <div className="text-sm text-white/60">Carregando extrato…</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className={panelClass}>
                    <div className="text-xs uppercase tracking-wide text-white/50">Saldo atual</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatMoneyBRL(summary.currentBalance)}
                    </div>
                  </div>

                  <div className={panelClass}>
                    <div className="text-xs uppercase tracking-wide text-white/50">Total de entradas</div>
                    <div className="mt-2 text-2xl font-semibold text-emerald-300">
                      {formatMoneyBRL(summary.totalCredits)}
                    </div>
                  </div>

                  <div className={panelClass}>
                    <div className="text-xs uppercase tracking-wide text-white/50">Total de saídas</div>
                    <div className="mt-2 text-2xl font-semibold text-rose-300">
                      {formatMoneyBRL(summary.totalDebits)}
                    </div>
                  </div>
                </div>

                <div className={panelClass}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                      Lançamentos
                    </h2>

                    <Link href="/minha-conta" className={secondaryBtn}>
                      Voltar
                    </Link>
                  </div>

                  {ledgerRows.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-4 text-sm text-white/60">
                      Nenhuma movimentação encontrada no extrato.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ledgerRows.map((row) => (
                        <div
                          key={row.id}
                          className="rounded-xl border border-white/10 bg-black/50 px-4 py-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80">
                                  {mapEntryTypeLabel(row.entry_type)}
                                </span>

                                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70">
                                  {mapSourceTypeLabel(row.source_type)}
                                </span>
                              </div>

                              <div className="mt-3 text-sm font-semibold text-white/90">
                                {row.description ?? 'Movimentação de crédito'}
                              </div>

                              <div className="mt-1 text-xs text-white/50">
                                {formatDateTimeBR(row.created_at)}
                              </div>

                              {row.source_id ? (
                                <div className="mt-1 text-[11px] text-white/40 break-all">
                                  Referência: {row.source_id}
                                </div>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm lg:min-w-[300px]">
                              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                                <div className="text-xs text-white/45">Movimentação</div>
                                <div className={`mt-1 font-semibold ${amountClass(row.amount_brl)}`}>
                                  {formatMoneyBRL(row.amount_brl)}
                                </div>
                              </div>

                              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                                <div className="text-xs text-white/45">Saldo após</div>
                                <div className="mt-1 font-semibold text-white/90">
                                  {formatMoneyBRL(row.balance_after_brl)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}