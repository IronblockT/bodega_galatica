'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoggedIn: boolean;
  profile: { avatar_key: string | null } | null;
  refreshProfile: () => Promise<void>;
  setAvatarKeyLocal: (key: string | null) => void;
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (email: string, redirectTo?: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [profile, setProfile] = useState<{ avatar_key: string | null } | null>(null);

  // mantém seu DEV MODE opcional
  const devForceLogin = process.env.NEXT_PUBLIC_DEV_FORCE_LOGIN === 'true';

  async function refreshProfile() {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('avatar_key')
      .eq('id', user.id)
      .maybeSingle();

    setProfile({ avatar_key: data?.avatar_key ?? null });
  }

  useEffect(() => {
    let mounted = true;

    // sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    });

    // updates
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo<AuthContextValue>(() => {
    const isLoggedIn = devForceLogin || !!user;

    return {
      user: devForceLogin ? ({ id: 'dev' } as any) : user,
      session,
      isLoggedIn,

      // ✅ NOVO: profile + helpers
      profile,
      refreshProfile,
      setAvatarKeyLocal: (key) =>
        setProfile(() => ({ avatar_key: key })),

      signInWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      signUpWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      resetPassword: async (email, redirectTo) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [devForceLogin, session, user, profile]); // ✅ inclua profile

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
