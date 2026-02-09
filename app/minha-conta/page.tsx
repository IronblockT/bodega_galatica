'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useAuth } from '@/components/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

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

// === classes copiadas do padrão CardSearchFilters / CardResultRow ===
const panelClass = 'rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur';
const titleClass = 'mb-4 text-sm font-semibold uppercase tracking-wide text-white/70';
const labelClass = 'mb-1 block text-xs text-white/60';
const inputClass =
  'w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/30';

const secondaryBtn =
  'rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors';

const primaryBtn =
  'rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors disabled:opacity-40';

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

  // Carregar dados
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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !profile) return;

    setSavingProfile(true);
    setErrorMsg(null);
    setOkMsg(null);

    const payload = {
      id: user.id,
      email: email,
      full_name: profile.full_name?.trim() || null,
      phone: profile.phone?.trim() || null,
      cpf: profile.cpf ? onlyDigits(profile.cpf) : null,

      // ✅ NOVO: salva o avatar escolhido
      avatar_key: profile.avatar_key ?? null,
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    setSavingProfile(false);

    if (error) {
      setErrorMsg(`Não foi possível salvar o perfil: ${error.message}`);
      return;
    }

    setOkMsg('Perfil atualizado com sucesso.');
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
          {/* TOP BAR — fora da box escura (no fundo claro) */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              Minha Conta
            </h1>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-lg text-black/65">
                Perfil, endereço e segurança.
              </p>

              <div className="flex gap-2">
                <Link href="/" className={secondaryBtn}>
                  Voltar
                </Link>
                <button onClick={handleLogout} className={secondaryBtn}>
                  Sair
                </button>
              </div>
            </div>
          </div>

          {/* Envelope dark: só conteúdo */}
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
                    <div className="mt-1 text-sm font-semibold text-white">
                      {email ?? '—'}
                    </div>
                  </div>

                  <div className={panelClass}>
                    <h2 className={titleClass}>Segurança</h2>
                    <p className="text-xs text-white/70">
                      Para alterar sua senha, use o fluxo de redefinição por email.
                    </p>
                    <div className="mt-4">
                      <Link href="/entrar" className={secondaryBtn}>
                        Redefinir senha
                      </Link>
                    </div>
                  </div>
                  <div className={panelClass}>
                    <h2 className={titleClass}>Avatar</h2>
                    <p className="text-xs text-white/70">
                      Escolha uma raça para representar seu perfil na Bodega Galáctica.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                      {[
                        {
                          key: 'arelian',
                          name: 'Arelians',
                          style: 'Aggro tático com controle leve',
                          why:
                            'Pressiona cedo com sinergias rápidas e remoções eficientes — no deserto, quem reage tarde não sobrevive.',
                        },
                        {
                          key: 'lumari',
                          name: 'Lúmari',
                          style: 'Controle e value ao longo do tempo',
                          why:
                            'Prefere jogos longos e respostas reativas, acumulando vantagem — quem controla o ritmo controla o desfecho.',
                        },
                        {
                          key: 'kharzun',
                          name: 'Kharzun',
                          style: 'Aggro explosivo e pressão constante',
                          why:
                            'Quer finalizar rápido com dano direto e trocas favoráveis — hesitação no deserto é sentença de morte.',
                        },
                        {
                          key: 'varkai',
                          name: 'Varkai',
                          style: 'Midrange técnico e vantagem incremental',
                          why:
                            'Adapta-se ao oponente com valor e eficiência — quem reutiliza sucata vence no longo prazo.',
                        },
                        {
                          key: 'sahrikaan',
                          name: "Sahri’Kaan",
                          style: 'Midrange pesado com liderança e buffs',
                          why:
                            'Estabelece presença e escala com o tempo — quem lidera com firmeza não precisa correr riscos.',
                        },
                      ].map((a) => {
                        const selected = profile?.avatar_key === a.key;

                        return (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() => setProfile((p) => (p ? ({ ...p, avatar_key: a.key } as any) : p))}
                            className={[
                              'group w-full rounded-xl border p-3 text-left transition',
                              'border-white/10 bg-black/50 hover:bg-black/60',
                              selected ? 'outline outline-1 outline-orange-400/60' : '',
                            ].join(' ')}
                          >
                            <div className="flex items-start gap-3">
                              {/* Preview do avatar (imagem) */}
                              <div className="relative">
                                <div className="h-12 w-12 rounded-lg border border-white/10 bg-black">
                                  <img
                                    src={`/avatars/${a.key}.png`}
                                    alt={a.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                {/* Zoom no hover (não quebra o layout) */}
                                <div
                                  className="
      pointer-events-none
      absolute left-0 top-0
      opacity-0
      transition-opacity duration-200
      group-hover:opacity-100
      z-50
    "
                                >
                                  <div className="mt-[-30px] ml-[70px] h-64 w-64 rounded-3xl border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,.8)]">
                                    <img
                                      src={`/avatars/${a.key}.png`}
                                      alt={a.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-semibold text-white">{a.name}</div>
                                  {selected && (
                                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-[#0B0C10]">
                                      Selecionado
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 text-xs text-white/70">{a.style}</div>
                                <div className="mt-1 text-xs text-white/55">{a.why}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        disabled={savingProfile}
                        onClick={async () => {
                          if (!user?.id || !profile) return;

                          setSavingProfile(true);
                          setErrorMsg(null);
                          setOkMsg(null);

                          const avatarKey = (profile as any).avatar_key ?? null;

                          const payload = {
                            id: user.id,
                            email: email,
                            full_name: profile.full_name?.trim() || null,
                            phone: profile.phone?.trim() || null,
                            cpf: profile.cpf ? onlyDigits(profile.cpf) : null,
                            avatar_key: avatarKey,
                          };

                          const { error } = await supabase
                            .from('profiles')
                            .upsert(payload, { onConflict: 'id' });

                          setSavingProfile(false);

                          if (error) {
                            setErrorMsg(`Não foi possível salvar o avatar: ${error.message}`);
                            return;
                          }

                          // ✅ Atualiza o Header imediatamente
                          setAvatarKeyLocal(avatarKey);

                          setOkMsg('Avatar atualizado com sucesso.');
                        }}
                        className={primaryBtn}
                      >
                        {savingProfile ? 'Salvando…' : 'Salvar avatar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Coluna direita */}
                <div className="space-y-6 lg:col-span-2">
                  <div className={panelClass}>
                    <h2 className={titleClass}>Dados pessoais</h2>

                    <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Nome completo</label>
                        <input
                          className={inputClass}
                          value={profile?.full_name ?? ''}
                          onChange={(e) =>
                            setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))
                          }
                          placeholder="Seu nome"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Telefone / WhatsApp</label>
                        <input
                          className={inputClass}
                          value={profile?.phone ?? ''}
                          onChange={(e) =>
                            setProfile((p) => (p ? { ...p, phone: e.target.value } : p))
                          }
                          placeholder="(11) 99999-9999"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>CPF (opcional)</label>
                        <input
                          className={inputClass}
                          value={profile?.cpf ?? ''}
                          onChange={(e) =>
                            setProfile((p) => (p ? { ...p, cpf: e.target.value } : p))
                          }
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div className="md:col-span-2 mt-2 flex justify-end">
                        <button type="submit" disabled={savingProfile} className={primaryBtn}>
                          {savingProfile ? 'Salvando…' : 'Salvar'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className={panelClass}>
                    <h2 className={titleClass}>Endereço principal</h2>

                    <form onSubmit={handleSaveAddress} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>CEP</label>
                        <input
                          className={inputClass}
                          value={address?.cep ?? ''}
                          onChange={(e) =>
                            setAddress((a) =>
                              a
                                ? { ...a, cep: e.target.value }
                                : ({
                                  id: '',
                                  user_id: user?.id ?? '',
                                  label: 'Principal',
                                  is_default: true,
                                  cep: e.target.value,
                                  street: '',
                                  number: '',
                                  complement: '',
                                  district: '',
                                  city: '',
                                  state: '',
                                } as AddressRow)
                            )
                          }
                          placeholder="00000-000"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>UF</label>
                        <input
                          className={inputClass}
                          value={address?.state ?? ''}
                          onChange={(e) => setAddress((a) => (a ? { ...a, state: e.target.value } : a))}
                          placeholder="SP"
                          maxLength={2}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>Rua</label>
                        <input
                          className={inputClass}
                          value={address?.street ?? ''}
                          onChange={(e) => setAddress((a) => (a ? { ...a, street: e.target.value } : a))}
                          placeholder="Rua Exemplo"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Número</label>
                        <input
                          className={inputClass}
                          value={address?.number ?? ''}
                          onChange={(e) => setAddress((a) => (a ? { ...a, number: e.target.value } : a))}
                          placeholder="123"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Complemento</label>
                        <input
                          className={inputClass}
                          value={address?.complement ?? ''}
                          onChange={(e) => setAddress((a) => (a ? { ...a, complement: e.target.value } : a))}
                          placeholder="Apto 45"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Bairro</label>
                        <input
                          className={inputClass}
                          value={address?.district ?? ''}
                          onChange={(e) => setAddress((a) => (a ? { ...a, district: e.target.value } : a))}
                          placeholder="Centro"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Cidade</label>
                        <input
                          className={inputClass}
                          value={address?.city ?? ''}
                          onChange={(e) => setAddress((a) => (a ? { ...a, city: e.target.value } : a))}
                          placeholder="São Paulo"
                        />
                      </div>

                      <div className="md:col-span-2 mt-2 flex justify-end">
                        <button type="submit" disabled={savingAddress} className={primaryBtn}>
                          {savingAddress ? 'Salvando…' : 'Salvar'}
                        </button>
                      </div>
                    </form>
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
