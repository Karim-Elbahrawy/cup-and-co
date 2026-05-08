'use client';

import { create } from 'zustand';

/**
 * Session-only identified-customer store (K4.4 / K4.5).
 *
 * Holds the JWT + minimal profile of a customer who opted to identify
 * themselves at the kiosk via phone+OTP. Cleared on idle reset, on
 * confirmation auto-reset, and explicitly via "Sign out" if we ever add
 * one. Default state is anonymous — kiosks NEVER persist identity across
 * customers.
 *
 * The JWT is held in memory only (no localStorage) so a refresh or PWA
 * restart drops it. That's the kiosk-correct behaviour: the next person
 * to walk up should never see a stranger's name.
 */

export interface IdentifiedCustomer {
  jwt: string;
  userId: string;
  /** Display name if known; falls back to a generic greeting otherwise. */
  name: string | null;
  /** Loyalty tier — UI shows the badge. */
  tier: 'bronze' | 'silver' | 'gold' | null;
  /** Current points balance (snapshot at identify time; cheap to refresh). */
  pointsBalance: number;
}

interface IdentifiedState {
  customer: IdentifiedCustomer | null;
  set: (customer: IdentifiedCustomer) => void;
  clear: () => void;
}

export const useIdentified = create<IdentifiedState>((set) => ({
  customer: null,
  set: (customer) => set({ customer }),
  clear: () => set({ customer: null }),
}));
