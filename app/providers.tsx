'use client';

import { AuthProvider } from '@/components/hooks/useAuth';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
