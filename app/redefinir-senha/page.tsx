'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { supabase } from '@/lib/supabaseClient';

export default function RedefinirSenhaPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Essa página só faz sentido quando o usuário chega via link de recovery.
  // Vamos checar se existe sessão.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      // Mesmo que dê erro, liberamos a UI com uma mensagem amigável.
      if (error) {
        setErrorMsg('Não foi possível validar a sessão de redefinição. Tente novamente pelo email.');
        setReady(true);
        return;
      }

      // Se não tiver sessão, normalmente o link expirou ou usuário abriu direto.
      if (!data.session) {
        setErrorMsg('Link inválido ou expirado. Solicite uma nova redefinição de senha.');
        setReady(true);
        return;
      }

      setReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    if (password.length < 6) {
      setLoading(false);
      setErrorMsg('Sua nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirm) {
      setLoading(false);
      setErrorMsg('As senhas não conferem.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Não foi possível atualizar sua senha.');
      return;
    }

    setMessage('Senha atualizada com sucesso! Você já pode entrar com a nova senha.');

    // Opcional: redireciona após alguns segundos
    setTimeout(() => {
      router.push('/entrar');
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-sand">

      <section className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur p-8 shadow-[0_18px_50px_rgba(0,0,0,.08)]">
          <h1 className="text-3xl font-semibold tracking-tight text-black">Redefinir senha</h1>
          <p className="mt-2 text-black/60">
            Defina uma nova senha para sua conta.
          </p>

          {!ready ? (
            <div className="mt-8 text-sm text-black/60">Carregando…</div>
          ) : (
            <>
              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                  <div className="mt-2">
                    <Link href="/entrar" className="font-semibold underline">
                      Voltar para entrar
                    </Link>
                  </div>
                </div>
              )}

              {!errorMsg && (
                <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-black/80">Nova senha</label>
                    <input
                      className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <p className="mt-2 text-xs text-black/50">Mínimo recomendado: 6 caracteres.</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-black/80">Confirmar nova senha</label>
                    <input
                      className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>

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
                    {loading ? 'Atualizando...' : 'Atualizar senha'}
                  </button>

                  <div className="text-center text-sm text-black/60">
                    <Link href="/entrar" className="font-semibold text-black hover:underline">
                      Voltar para entrar
                    </Link>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
