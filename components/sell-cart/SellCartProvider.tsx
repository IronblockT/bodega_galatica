"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SellPayoutType = "cash" | "store_credit";

export type SellCartQuoteSnapshot = {
  sku_key: string;
  card_uid: string;
  finish: string;
  promo_type: string;
  condition: string;
  quantity: number;

  sell_price: number | string;
  pricing_rule_id: string | null;
  rule_name: string | null;
  calculation_type: string | null;

  base_buy_price_unit: number | string;
  stock_reduction_percent: number | string;
  adjusted_buy_price_unit: number | string;
  rounded_buy_price_unit: number | string;

  cash_buy_price_unit: number | string;
  cash_buy_price_total: number | string;

  store_credit_buy_price_unit: number | string;
  store_credit_buy_price_total: number | string;

  buy_price_total: number | string;

  max_qty_per_sku: number;
  stock_on_hand: number;
  stock_reserved: number;

  is_paused_by_stock: boolean;
  exceeds_qty_limit: boolean;
  manual_review_required: boolean;
  review_reason: string | null;

  cash_available: number | string;
  buy_budget_left_total: number | string;

  cash_allowed: boolean;
  store_credit_allowed: boolean;
  allowed_payout_type: string | null;

  is_buylist_available: boolean;
  unavailable_reason: string | null;
};

export type SellCartCardSnapshot = {
  card_uid: string;
  expansion_code: string | null;
  title: string;
  subtitle: string | null;
  image_front_url: string | null;
  card_type_label: string | null;
  rarity_label: string | null;
};

export type SellCartItem = {
  sku_key: string;
  quantity: number;
  payout_type: SellPayoutType;
  quote_snapshot: SellCartQuoteSnapshot;
  card_snapshot: SellCartCardSnapshot | null;
  added_at: string;
};

type SellCartContextValue = {
  cashItems: SellCartItem[];
  storeCreditItems: SellCartItem[];
  allItems: SellCartItem[];

  cashCount: number;
  storeCreditCount: number;
  totalCount: number;

  cashTotal: number;
  storeCreditTotal: number;
  grandTotal: number;

  addItem: (item: {
    sku_key: string;
    quantity: number;
    payout_type: SellPayoutType;
    quote_snapshot: SellCartQuoteSnapshot;
    card_snapshot?: SellCartCardSnapshot | null;
  }) => void;

  setQty: (
    payout_type: SellPayoutType,
    sku_key: string,
    quantity: number
  ) => void;

  removeItem: (payout_type: SellPayoutType, sku_key: string) => void;
  clear: () => void;
};

const SellCartContext = createContext<SellCartContextValue | undefined>(
  undefined
);

const LS_KEY = "bg_sell_cart_v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeItems(items: SellCartItem[]) {
  return items.map((item) => ({
    ...item,
    card_snapshot: item.card_snapshot ?? null,
  }));
}

function toNumber(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? Number(n) : 0;
}

function getItemTotal(item: SellCartItem) {
  if (item.payout_type === "store_credit") {
    return toNumber(item.quote_snapshot.store_credit_buy_price_total);
  }

  return toNumber(item.quote_snapshot.cash_buy_price_total);
}

export function SellCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SellCartItem[]>([]);

  useEffect(() => {
    const saved = readJson<SellCartItem[]>(LS_KEY, []);
    setItems(Array.isArray(saved) ? normalizeItems(saved) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  const cashItems = useMemo(
    () => items.filter((item) => item.payout_type === "cash"),
    [items]
  );

  const storeCreditItems = useMemo(
    () => items.filter((item) => item.payout_type === "store_credit"),
    [items]
  );

  const cashCount = useMemo(
    () => cashItems.reduce((acc, item) => acc + Number(item.quantity ?? 0), 0),
    [cashItems]
  );

  const storeCreditCount = useMemo(
    () =>
      storeCreditItems.reduce(
        (acc, item) => acc + Number(item.quantity ?? 0),
        0
      ),
    [storeCreditItems]
  );

  const totalCount = cashCount + storeCreditCount;

  const cashTotal = useMemo(
    () => cashItems.reduce((acc, item) => acc + getItemTotal(item), 0),
    [cashItems]
  );

  const storeCreditTotal = useMemo(
    () => storeCreditItems.reduce((acc, item) => acc + getItemTotal(item), 0),
    [storeCreditItems]
  );

  const grandTotal = cashTotal + storeCreditTotal;

  function addItem(input: {
    sku_key: string;
    quantity: number;
    payout_type: SellPayoutType;
    quote_snapshot: SellCartQuoteSnapshot;
    card_snapshot?: SellCartCardSnapshot | null;
  }) {
    const quantity = Math.max(1, Number(input.quantity || 1));

    setItems((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.sku_key === input.sku_key &&
          item.payout_type === input.payout_type
      );

      if (idx >= 0) {
        const copy = [...prev];
        const existing = copy[idx];

        const nextQty = Math.min(
          Number(existing.quantity ?? 0) + quantity,
          Number(input.quote_snapshot.max_qty_per_sku ?? 999)
        );

        copy[idx] = {
          ...existing,
          quantity: nextQty,
          quote_snapshot: {
            ...input.quote_snapshot,
            quantity: nextQty,
          },
          card_snapshot: input.card_snapshot ?? existing.card_snapshot ?? null,
        };

        return copy;
      }

      return [
        ...prev,
        {
          sku_key: input.sku_key,
          quantity,
          payout_type: input.payout_type,
          quote_snapshot: {
            ...input.quote_snapshot,
            quantity,
          },
          card_snapshot: input.card_snapshot ?? null,
          added_at: new Date().toISOString(),
        },
      ];
    });
  }

  function setQty(
    payout_type: SellPayoutType,
    sku_key: string,
    quantity: number
  ) {
    const nextQty = Math.max(0, Number(quantity || 0));

    setItems((prev) => {
      return prev
        .map((item) => {
          if (item.sku_key !== sku_key || item.payout_type !== payout_type) {
            return item;
          }

          return {
            ...item,
            quantity: nextQty,
            quote_snapshot: {
              ...item.quote_snapshot,
              quantity: nextQty,
            },
          };
        })
        .filter((item) => item.quantity > 0);
    });
  }

  function removeItem(payout_type: SellPayoutType, sku_key: string) {
    setItems((prev) =>
      prev.filter(
        (item) =>
          !(item.sku_key === sku_key && item.payout_type === payout_type)
      )
    );
  }

  function clear() {
    setItems([]);
  }

  const value = useMemo<SellCartContextValue>(
    () => ({
      cashItems,
      storeCreditItems,
      allItems: items,

      cashCount,
      storeCreditCount,
      totalCount,

      cashTotal,
      storeCreditTotal,
      grandTotal,

      addItem,
      setQty,
      removeItem,
      clear,
    }),
    [
      items,
      cashItems,
      storeCreditItems,
      cashCount,
      storeCreditCount,
      totalCount,
      cashTotal,
      storeCreditTotal,
      grandTotal,
    ]
  );

  return (
    <SellCartContext.Provider value={value}>
      {children}
    </SellCartContext.Provider>
  );
}

export function useSellCart() {
  const ctx = useContext(SellCartContext);

  if (!ctx) {
    throw new Error("useSellCart must be used inside <SellCartProvider>");
  }

  return ctx;
}