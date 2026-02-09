'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useAuth } from '@/components/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

import { AvatarPicker } from '@/components/account/AvatarPicker';
import { ProfileForm } from '@/components/account/ProfileForm';
import { AddressForm } from '@/components/account/AddressForm';

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  avatar_key?: string | null;
};

type AddressRow = {
  id: string;
  user_id: string;
  label: string | null;
  is_default: boolean;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '');
}

const panelClass = 'rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur';
const titleClass = 'mb-4 text-sm font-semibold uppercase tracking-wide text-white/70';
const topSecondaryBtn =
  'rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black/80 shadow-sm hover:bg-black hover:text-white transition-colors';

const topDangerBtn =
  'rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors';

const secondaryBtn =
  'rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors';

export default function MinhaContaPage() {
  const router = useRouter();
  const { isLoggedIn, user, signOut, setAvatarKeyLocal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [address, setAddress] = useState<AddressRow | null>(null);

  const email = useMemo(() => user?.email ?? null, [user]);

  // Guard: exige login
  useEffect(() => {
    if (!isLoggedIn) router.replace('/entrar?next=/minha-conta');
  }, [isLoggedIn, router]);

  // Load
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) return;

      setLoading(true);
      setErrorMsg(null);
      setOkMsg(null);

      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, cpf, avatar_key')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (pErr) {
        setErrorMsg(`Erro ao carregar perfil: ${pErr.message}`);
        setLoading(false);
        return;
      }

      if (!p) {
        const { data: created, error: cErr } = await supabase
          .from('profiles')
          .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' })
          .select('id, email, full_name, phone, cpf, avatar_key')
          .single();

        if (!mounted) return;

        if (cErr) {
          setErrorMsg(`Erro ao criar perfil: ${cErr.message}`);
          setLoading(false);
          return;
        }

        setProfile(created);
      } else {
        setProfile(p);
      }

      const { data: a, error: aErr } = await supabase
        .from('addresses')
        .select('id, user_id, label, is_default, cep, street, number, complement, district, city, state')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (!mounted) return;

      if (aErr) {
        setErrorMsg(`Erro ao carregar endereço: ${aErr.message}`);
        setLoading(false);
        return;
      }

      setAddress(a ?? null);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.email]);

  // ✅ Centraliza o "payload builder" do perfil
  const buildProfilePayload = useCallback(() => {
    if (!user?.id || !profile) return null;

    return {
      id: user.id,
      email: email,
      full_name: profile.full_name?.trim() || null,
      phone: profile.phone?.trim() || null,
      cpf: profile.cpf ? onlyDigits(profile.cpf) : null,
      avatar_key: profile.avatar_key ?? null,
    };
  }, [user?.id, profile, email]);

  // ✅ Um único método de salvar perfil (serve pro form e pro avatar)
  const saveProfile = useCallback(async (opts?: { updateHeaderAvatar?: boolean; successMsg?: string }) => {
    const payload = buildProfilePayload();
    if (!payload) return;

    setSavingProfile(true);
    setErrorMsg(null);
    setOkMsg(null);

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

    setSavingProfile(false);

    if (error) {
      setErrorMsg(`Não foi possível salvar o perfil: ${error.message}`);
      return;
    }

    if (opts?.updateHeaderAvatar) {
      setAvatarKeyLocal(payload.avatar_key ?? null);
    }

    setOkMsg(opts?.successMsg ?? 'Perfil atualizado com sucesso.');
  }, [buildProfilePayload, setAvatarKeyLocal]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    await saveProfile({ updateHeaderAvatar: true, successMsg: 'Perfil atualizado com sucesso.' });
  }

  async function handleSaveAvatar() {
    await saveProfile({ updateHeaderAvatar: true, successMsg: 'Avatar atualizado com sucesso.' });
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    setSavingAddress(true);
    setErrorMsg(null);
    setOkMsg(null);

    const payload = {
      user_id: user.id,
      label: 'Principal',
      is_default: true,
      cep: address?.cep ? onlyDigits(address.cep) : null,
      street: address?.street?.trim() || null,
      number: address?.number?.trim() || null,
      complement: address?.complement?.trim() || null,
      district: address?.district?.trim() || null,
      city: address?.city?.trim() || null,
      state: address?.state?.trim() || null,
    };

    if (address?.id) {
      const { error } = await supabase.from('addresses').update(payload).eq('id', address.id);
      setSavingAddress(false);

      if (error) {
        setErrorMsg(`Não foi possível salvar o endereço: ${error.message}`);
        return;
      }

      setOkMsg('Endereço atualizado com sucesso.');
      return;
    }

    const { data: created, error } = await supabase
      .from('addresses')
      .insert(payload)
      .select('id, user_id, label, is_default, cep, street, number, complement, district, city, state')
      .single();

    setSavingAddress(false);

    if (error) {
      setErrorMsg(`Não foi possível salvar o endereço: ${error.message}`);
      return;
    }

    setAddress(created);
    setOkMsg('Endereço salvo com sucesso.');
  }

  async function handleLogout() {
    await signOut();
    router.push('/');
  }

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(249,115,22,0.12),transparent_60%)]" />

      <div className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 py-10">
          {/* TOP BAR */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              Minha Conta
            </h1>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-lg text-black/65">Perfil, endereço e segurança.</p>

              <div className="flex gap-2">
                <Link href="/" className={topSecondaryBtn}>
                  Voltar
                </Link>
                <button onClick={handleLogout} className={topDangerBtn}>
                  Sair
                </button>
              </div>
            </div>
          </div>

          {/* Envelope dark */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0C10] p-6 md:p-8">
            {(errorMsg || okMsg) && (
              <div className="mb-6 space-y-2">
                {errorMsg && (
                  <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-rose-200 backdrop-blur">
                    {errorMsg}
                  </div>
                )}
                {okMsg && (
                  <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-amber-200 backdrop-blur">
                    {okMsg}
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="text-sm text-white/60">Carregando…</div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Coluna esquerda */}
                <div className="space-y-6">
                  <div className={panelClass}>
                    <h2 className={titleClass}>Conta</h2>
                    <div className="text-xs text-white/60">Email</div>
                    <div className="mt-1 text-sm font-semibold text-white">{email ?? '—'}</div>
                  </div>

                  <div className={panelClass}>
                    <h2 className={titleClass}>Segurança</h2>
                    <p className="text-xs text-white/70">
                      Para alterar sua senha, use o fluxo de redefinição por email.
                    </p>
                    <div className="mt-4">
                      <Link href="/redefinir-senha" className={secondaryBtn}>
                        Redefinir senha
                      </Link>
                    </div>
                  </div>

                  <AvatarPicker
                    selectedKey={profile?.avatar_key ?? null}
                    onSelect={(key) => setProfile((p) => (p ? { ...p, avatar_key: key } : p))}
                    onSave={handleSaveAvatar}
                    saving={savingProfile}
                  />
                </div>

                {/* Coluna direita */}
                <div className="space-y-6 lg:col-span-2">
                  <ProfileForm
                    profile={profile}
                    setProfile={setProfile}
                    onSave={handleSaveProfile}
                    saving={savingProfile}
                  />

                  {user?.id && (
                    <AddressForm
                      userId={user.id}
                      address={address}
                      setAddress={setAddress}
                      onSave={handleSaveAddress}
                      saving={savingAddress}
                    />
                  )}
                  <div className={panelClass}>
                    <h2 className={titleClass}>Meus pedidos</h2>

                    <p className="text-xs text-white/70">
                      Em breve você poderá acompanhar aqui seus pedidos de{' '}
                      <span className="font-semibold text-white/85">compra</span> e{' '}
                      <span className="font-semibold text-white/85">venda</span>, com histórico,
                      status e detalhes de cada transação.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {/* COMPRAS */}
                      <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                        <div className="text-xs text-white/60">Compras</div>
                        <div className="mt-1 text-sm font-semibold text-white">0 pedidos</div>

                        <div className="mt-2 text-xs text-white/55">
                          Você ainda não fez nenhuma compra na Bodega.
                        </div>

                        <div className="mt-4">
                          <Link href="/meus-pedidos?tipo=compras" className={secondaryBtn}>
                            Acompanhar pedidos
                          </Link>
                        </div>
                      </div>

                      {/* VENDAS */}
                      <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                        <div className="text-xs text-white/60">Vendas</div>
                        <div className="mt-1 text-sm font-semibold text-white">0 pedidos</div>

                        <div className="mt-2 text-xs text-white/55">
                          Você ainda não realizou nenhuma venda.
                        </div>

                        <div className="mt-4">
                          <Link href="/meus-pedidos?tipo=vendas" className={secondaryBtn}>
                            Acompanhar pedidos
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Link href="/meus-pedidos" className={secondaryBtn}>
                        Ver histórico
                      </Link>
                    </div>

                    <div className="mt-3 text-[11px] text-white/45">
                      * A área de “Meus pedidos” está em construção.
                      Em breve: status, histórico completo, comprovantes e detalhes.
                    </div>
                  </div>
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