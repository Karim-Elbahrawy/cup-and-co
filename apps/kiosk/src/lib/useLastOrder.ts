'use client';

import { create } from 'zustand';
import type { PlaceOrderResponse } from './api';

/**
 * Tiny in-memory store that holds the just-placed order between
 * /checkout and /confirmation. Cleared on idle reset.
 *
 * Why not a search-param + refetch: the kiosk navigation is a
 * client-side push, latency matters (the customer is staring at a
 * spinner), and the order data is right there. Persisting to the URL
 * would also let a customer share the URL — undesirable.
 *
 * If a customer somehow lands on /confirmation cold (refresh, deep link),
 * the page redirects to / since the store is empty.
 *
 * K5.1 — extended with `queued`: true when the order couldn't reach the
 * server and was saved to the offline IDB queue instead. The
 * confirmation page swaps in a softer "Offline — will sync" pill and
 * uses the temp pickup code stamped at queue time.
 */
export interface LastOrderPayload extends PlaceOrderResponse {
  queued?: boolean;
}

interface LastOrderState {
  order: LastOrderPayload | null;
  set: (order: LastOrderPayload) => void;
  clear: () => void;
}

export const useLastOrder = create<LastOrderState>((set) => ({
  order: null,
  set: (order) => set({ order }),
  clear: () => set({ order: null }),
}));
