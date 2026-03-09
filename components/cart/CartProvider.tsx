"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from '@/components/hooks/useAuth';

export type CartItem = { sku_key: string; qty: number };

type ReserveResponse = {
  ok: boolean;
  order_id?: string;
  expires_at?: string | null;
  status?: string | null;
  error?: string;
};

type CartContextValue = {
  items: CartItem[];
  count: number;

  orderId: string | null;
  expiresAt: string | null;
  reserving: boolean;
  lastReserveError: string | null;

  addItem: (sku_key: string, qty: number) => void;
  setQty: (sku_key: string, qty: number) => void;
  removeItem: (sku_key: string) => void;
  clear: () => Promise<void>;

  reserveNow: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const LS_KEY = "bg_cart_v1";
const LS_ORDER = "bg_cart_order_v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoggedIn } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [reserving, setReserving] = useState(false);
  const [lastReserveError, setLastReserveError] = useState<string | null>(null);

  // load LS
  useEffect(() => {
    const saved = readJson<CartItem[]>(LS_KEY, []);
    setItems(Array.isArray(saved) ? saved : []);

    const savedOrder = readJson<{ order_id?: string; expires_at?: string | null }>(LS_ORDER, {});
    setOrderId(savedOrder.order_id ?? null);
    setExpiresAt(savedOrder.expires_at ?? null);
  }, []);

  // persist items
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  // persist order tracking
  useEffect(() => {
    localStorage.setItem(LS_ORDER, JSON.stringify({ order_id: orderId, expires_at: expiresAt }));
  }, [orderId, expiresAt]);

  const count = useMemo(() => items.reduce((acc, it) => acc + (it.qty ?? 0), 0), [items]);

  const addItem = (sku_key: string, qty: number) => {
    const q = Math.max(1, Number(qty || 1));
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.sku_key === sku_key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + q };
        return copy;
      }
      return [...prev, { sku_key, qty: q }];
    });
  };

  const setQty = (sku_key: string, qty: number) => {
    const q = Math.max(0, Number(qty || 0));
    setItems((prev) => {
      const copy = prev.map((x) => (x.sku_key === sku_key ? { ...x, qty: q } : x));
      return copy.filter((x) => x.qty > 0);
    });
  };

  const removeItem = (sku_key: string) => {
    setItems((prev) => prev.filter((x) => x.sku_key !== sku_key));
  };

  const clear = async () => {
    try {
      if (orderId) {
        await fetch("/api/cart/release", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ order_id: orderId }),
        });
      }
    } catch (err) {
      console.error("[cart.clear] failed to release order", err);
    } finally {
      setItems([]);
      setOrderId(null);
      setExpiresAt(null);
      setLastReserveError(null);
    }
  };

  const reserveNow = useCallback(async () => {
    if (!isLoggedIn) return;
    if (!session?.access_token) return;
    if (items.length === 0) return;

    setReserving(true);
    setLastReserveError(null);

    try {
      const res = await fetch("/api/cart/reserve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          items,
          ttl_minutes: 30,
        }),
      });

      const json = (await res.json()) as ReserveResponse;

      if (!res.ok || !json.ok) {
        setLastReserveError(json.error ?? "Falha ao reservar carrinho.");
        return;
      }

      setOrderId(json.order_id ?? null);
      setExpiresAt(json.expires_at ?? null);
    } catch (e: any) {
      setLastReserveError(e?.message ?? "Falha ao reservar carrinho.");
    } finally {
      setReserving(false);
    }
  }, [isLoggedIn, session?.access_token, items, orderId]);

  // ✅ auto-renova a cada 12 minutos (enquanto tiver carrinho)
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!session?.access_token) return;
    if (items.length === 0) return;

    const id = window.setInterval(() => {
      reserveNow();
    }, 12 * 60 * 1000);

    return () => window.clearInterval(id);
  }, [isLoggedIn, session?.access_token, items.length, reserveNow]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      orderId,
      expiresAt,
      reserving,
      lastReserveError,
      addItem,
      setQty,
      removeItem,
      clear,
      reserveNow,
    }),
    [items, count, orderId, expiresAt, reserving, lastReserveError]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}