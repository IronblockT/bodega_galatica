'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/hooks/useAuth';
import { SiteFooter } from '@/components/layout/SiteFooter';

type Mode = 'login' | 'signup' | 'reset';

export default function EntrarClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isLoggedIn, signInWithPassword, signUpWithPassword, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // opcional: /entrar?next=/cartas
  const nextPath = searchParams.get('next') || '/';

  useEffect(() => {
    if (isLoggedIn) router.replace(nextPath);
  }, [isLoggedIn, nextPath, router]);

  function clearAlerts() {
    setErrorMsg(null);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearAlerts();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setLoading(false);
      setErrorMsg('Informe seu email.');
      return;
    }

    if (mode !== 'reset' && !password) {
      setLoading(false);
      setErrorMsg('Informe sua senha.');
      return;
    }

    if (mode === 'login') {
      const res = await signInWithPassword(normalizedEmail, password);
      setLoading(false);

      if (!res.ok) {
        setErrorMsg(res.error ?? 'Falha ao entrar. Verifique seu email e senha.');
        return;
      }

      // ✅ você pediu: após logar, ficar na home (ou respeitar ?next)
      router.push(nextPath || '/');
      return;
    }

    if (mode === 'signup') {
      const res = await signUpWithPassword(normalizedEmail, password);
      setLoading(false);

      if (!res.ok) {
        setErrorMsg(res.error ?? 'Falha ao criar conta.');
        return;
      }

      setMessage(
        'Conta criada! Se sua conta exigir confirmação por email, verifique sua caixa de entrada para ativar o acesso.'
      );
      setMode('login');
      return;
    }

    // reset
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = `${origin}/redefinir-senha`;

    const res = await resetPassword(normalizedEmail, redirectTo);
    setLoading(false);

    if (!res.ok) {
      setErrorMsg(res.error ?? 'Não foi possível enviar o email de redefinição.');
      return;
    }

    setMessage('Email enviado! Verifique sua caixa de entrada para redefinir sua senha.');
    setMode('login');
  }

  return (
    <main className="min-h-screen bg-[#F6F0E6] flex flex-col">
      <section className="mx-auto max-w-md px-4 py-14 flex-1">
        <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur p-8 shadow-[0_18px_50px_rgba(0,0,0,.08)]">
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Redefinir senha'}
          </h1>

          <p className="mt-2 text-black/60">
            {mode === 'login'
              ? 'Acesse sua conta para comprar e vender cartas.'
              : mode === 'signup'
                ? 'Crie sua conta para começar a negociar na Bodega Galáctica.'
                : 'Vamos te enviar um link por email para redefinir sua senha.'}
          </p>

          {mode !== 'reset' && (
            <div className="mt-6 flex gap-2 rounded-2xl bg-black/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearAlerts();
                }}
                className={[
                  'flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition',
                  mode === 'login' ? 'bg-white shadow-sm text-black' : 'text-black/60 hover:text-black',
                ].join(' ')}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearAlerts();
                }}
                className={[
                  'flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition',
                  mode === 'signup' ? 'bg-white shadow-sm text-black' : 'text-black/60 hover:text-black',
                ].join(' ')}
              >
                Criar conta
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-black/80">Email</label>
              <input
                className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="seuemail@exemplo.com"
                required
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="text-sm font-medium text-black/80">Senha</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="mt-2 text-xs text-black/50">Mínimo recomendado: 6 caracteres.</p>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    clearAlerts();
                    setPassword('');
                  }}
                  className="text-sm font-semibold text-black/70 hover:text-black hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {message}
              </div>
            )}

            <button
              disabled={loading}
              className={[
                'w-full rounded-full px-6 py-3 text-sm font-semibold transition',
                'text-[#0B0C10]',
                'bg-gradient-to-r from-amber-300 via-amber-200 to-rose-200',
                'shadow-[0_12px_32px_rgba(245,158,11,.18)]',
                'hover:brightness-[1.03] disabled:opacity-60',
              ].join(' ')}
            >
              {loading
                ? mode === 'login'
                  ? 'Entrando...'
                  : mode === 'signup'
                    ? 'Criando...'
                    : 'Enviando...'
                : mode === 'login'
                  ? 'Entrar'
                  : mode === 'signup'
                    ? 'Criar conta'
                    : 'Enviar link'}
            </button>

            <div className="pt-2 text-center text-sm text-black/60">
              {mode === 'login' ? (
                <>
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    className="font-semibold text-black hover:underline"
                    onClick={() => setMode('signup')}
                  >
                    Criar agora
                  </button>
                </>
              ) : mode === 'signup' ? (
                <>
                  Já tem conta?{' '}
                  <button
                    type="button"
                    className="font-semibold text-black hover:underline"
                    onClick={() => setMode('login')}
                  >
                    Entrar
                  </button>
                </>
              ) : (
                <>
                  Lembrou a senha?{' '}
                  <button
                    type="button"
                    className="font-semibold text-black hover:underline"
                    onClick={() => setMode('login')}
                  >
                    Voltar para entrar
                  </button>
                </>
              )}
            </div>

            <div className="text-center text-xs text-black/45">
              Ao continuar, você concorda com nossos{' '}
              <Link href="/termos" className="underline hover:text-black">
                termos
              </Link>{' '}
              e{' '}
              <Link href="/privacidade" className="underline hover:text-black">
                política de privacidade
              </Link>
              .
            </div>
          </form>
        </div>
      </section>
      
      <div className="mt-auto">
        <SiteFooter />
      </div>
    </main>
  );
}
