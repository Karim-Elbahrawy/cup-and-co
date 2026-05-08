'use client';

import { create } from 'zustand';

/**
 * Tiny UI-only zustand store for the cart drawer's open state.
 *
 * Why a global store rather than prop drilling: the CartPill is rendered
 * by /catalog (and later /products/[id]/page.tsx if we want), but the
 * actual <CartDrawer/> mount lives at the page root. Lifting open-state
 * to a store keeps both surfaces decoupled and lets future pages open the
 * drawer with a one-line import.
 *
 * The store is deliberately separate from `useCart` (the items store) —
 * mixing UI state with domain state makes both harder to test.
 *
 * Per docs/KIOSK-PLAN.md K1.5.
 */

interface CartDrawerState {
  open: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

export const useCartDrawer = create<CartDrawerState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
