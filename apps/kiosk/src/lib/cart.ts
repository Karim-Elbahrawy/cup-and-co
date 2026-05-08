/**
 * Kiosk cart store — zustand, in-memory only.
 *
 * Unlike customer-web (which persists cart across reloads), the kiosk
 * intentionally does NOT persist cart between sessions. Kiosks are shared
 * hardware — the next customer must never see the previous customer's
 * pending order. Idle reset (K1.9) calls `clear()` as part of returning
 * to the attract loop.
 *
 * Each line item is keyed by a synthetic `lineId` so the same product with
 * different option selections (medium vs large; less ice vs no ice) lives
 * on separate lines instead of merging.
 *
 * Per docs/KIOSK-PLAN.md K1.5 / K1.9.
 */

import { create } from 'zustand';
import type { Product, ProductOption } from '@cup-and-co/types';

export interface CartLineOption {
  /** Option group — 'size' | 'sugar' | 'ice' | 'milk' | etc. */
  group: ProductOption['group_name'];
  /** Selected option ID (FK to ProductOption.id). */
  optionId: string;
  nameEn: string;
  nameAr: string;
  priceDeltaEgp: number;
}

export interface CartLine {
  /** Synthetic UUID — see `addLine` below for why. */
  lineId: string;
  product: Pick<
    Product,
    'id' | 'name_en' | 'name_ar' | 'image_url' | 'base_price_egp' | 'prep_minutes'
  >;
  quantity: number;
  options: CartLineOption[];
}

interface CartState {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, 'lineId'>) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

/**
 * Per-line subtotal in EGP. Pure helper exported for use in CartPill and
 * the eventual checkout summary in K1.7.
 */
export function lineSubtotalEgp(line: CartLine): number {
  const optionsDelta = line.options.reduce((sum, o) => sum + o.priceDeltaEgp, 0);
  return (line.product.base_price_egp + optionsDelta) * line.quantity;
}

/** Cart-level grand total. */
export function cartTotalEgp(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + lineSubtotalEgp(l), 0);
}

/** Cart-level item count (sum of quantities, not unique lines). */
export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/**
 * crypto.randomUUID is broadly supported on iPad Safari 15.4+, which is
 * comfortably below the iOS 17 floor we target. We still guard for SSR
 * since this is also imported by RSC trees in dev.
 */
function newLineId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useCart = create<CartState>((set) => ({
  lines: [],
  addLine: (line) =>
    set((state) => ({
      lines: [...state.lines, { ...line, lineId: newLineId() }],
    })),
  setQuantity: (lineId, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((l) => l.lineId !== lineId)
          : state.lines.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
    })),
  removeLine: (lineId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.lineId !== lineId) })),
  clear: () => set({ lines: [] }),
}));
