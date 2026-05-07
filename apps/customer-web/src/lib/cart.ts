import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { track } from './analytics';

export interface CartItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  imageUrl: string;
  quantity: number;
  options: Record<string, string>; // { size: 'Medium', sugar: 'Normal' }
  unitPriceEgp: number;
}

export interface CartState {
  items: CartItem[];
  redeemPoints: number;
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (key: string, qty: number) => void;
  remove: (key: string) => void;
  setRedeemPoints: (n: number) => void;
  clear: () => void;
}

/**
 * Stable hash for a cart line: same productId + same options merge into a
 * single line whose quantity sums.
 */
export function lineKey(input: { productId: string; options: Record<string, string> }): string {
  const sortedOpts = Object.entries(input.options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('|');
  return `${input.productId}::${sortedOpts}`;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      redeemPoints: 0,
      add: (item) =>
        set((state) => {
          const qty = item.quantity ?? 1;
          const key = lineKey(item);
          // Analytics: add_to_cart (Phase 1.2 of UPGRADE-PLAN.md). Fired
          // regardless of whether this merges with an existing line.
          track({
            name: 'add_to_cart',
            props: {
              product_id: item.productId,
              quantity: qty,
              unit_price: item.unitPriceEgp,
              currency: 'EGP',
            },
          });
          const existing = state.items.find((it) => lineKey(it) === key);
          if (existing) {
            return {
              items: state.items.map((it) =>
                lineKey(it) === key ? { ...it, quantity: it.quantity + qty } : it,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: qty }],
          };
        }),
      updateQuantity: (key, qty) =>
        set((state) => ({
          items: state.items
            .map((it) => (lineKey(it) === key ? { ...it, quantity: qty } : it))
            .filter((it) => it.quantity > 0),
        })),
      remove: (key) =>
        set((state) => ({ items: state.items.filter((it) => lineKey(it) !== key) })),
      setRedeemPoints: (n) => set({ redeemPoints: Math.max(0, Math.floor(n)) }),
      clear: () => set({ items: [], redeemPoints: 0 }),
    }),
    {
      name: 'cup-and-co.cart',
      version: 1,
    },
  ),
);

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((s, it) => s + it.quantity * it.unitPriceEgp, 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((s, it) => s + it.quantity, 0);
}
