type CartItem = { sku_key: string; qty: number };
type CartState = { order_id: string | null; items: CartItem[]; updated_at: number };

const KEY = "bg_cart_v1";

export function loadCart(): CartState {
  if (typeof window === "undefined") return { order_id: null, items: [], updated_at: Date.now() };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { order_id: null, items: [], updated_at: Date.now() };
    return JSON.parse(raw) as CartState;
  } catch {
    return { order_id: null, items: [], updated_at: Date.now() };
  }
}

export function saveCart(next: CartState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function addToCart(items: CartItem[], sku_key: string, qty: number) {
  const map = new Map(items.map((i) => [i.sku_key, i.qty]));
  map.set(sku_key, (map.get(sku_key) ?? 0) + qty);
  return Array.from(map.entries()).map(([sku_key, qty]) => ({ sku_key, qty }));
}

export async function upsertCartOnServer(input: {
  user_id: string;
  order_id: string | null;
  items: CartItem[];
  ttl_minutes?: number;
}) {
  const res = await fetch("/api/cart/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: input.user_id,
      order_id: input.order_id,
      items: input.items,
      ttl_minutes: input.ttl_minutes ?? 30,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Falha ao atualizar carrinho");
  return json as { ok: true; order_id: string; reserve: any };
}

export async function refreshCartReservation(order_id: string, ttl_minutes = 30) {
  const res = await fetch("/api/cart/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id, ttl_minutes }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Falha ao renovar reserva");
  return json;
}