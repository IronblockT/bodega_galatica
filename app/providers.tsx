'use client';

import React from 'react';
import { AuthProvider } from '@/components/hooks/useAuth';
import { CartProvider } from '@/components/cart/CartProvider';
import { SellCartProvider } from '@/components/sell-cart/SellCartProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <SellCartProvider>{children}</SellCartProvider>
      </CartProvider>
    </AuthProvider>
  );
}