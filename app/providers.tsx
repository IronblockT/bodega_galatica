'use client';

import React from 'react';
import { AuthProvider } from '@/components/hooks/useAuth';
import { CartProvider } from '@/components/cart/CartProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}