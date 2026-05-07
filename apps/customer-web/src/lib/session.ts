'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SessionUser } from './types';
import { identify, resetAnalytics } from './analytics';

export type Language = 'en' | 'ar';

interface SessionState {
  token: string | null;
  user: SessionUser | null;
  language: Language;
  /** True once Zustand has rehydrated from localStorage on the client. */
  hydrated: boolean;
  setSession: (token: string, user: SessionUser) => void;
  setUser: (user: SessionUser) => void;
  setRole: (role: SessionUser['role']) => void;
  setLanguage: (language: Language) => void;
  setFullName: (name: string) => void;
  setAvatarId: (id: number) => void;
  setGender: (gender: 'male' | 'female' | 'prefer_not_to_say') => void;
  logout: () => void;
  setHydrated: () => void;
}

/**
 * Single source of truth for the customer-web session. Persists to
 * `localStorage` so a refresh keeps the user signed in. The `hydrated` flag
 * lets components avoid SSR/CSR mismatch when rendering auth-aware UI.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      language: 'en',
      hydrated: false,
      setSession: (token, user) => {
        // Phase 1.2 analytics: identify on login. Role-only attribute; tier
        // and campus_id will be added when those phases land.
        identify(user.id, { role: user.role });
        set({ token, user });
      },
      setUser: (user) => set({ user }),
      setRole: (role) =>
        set((s) => {
          if (s.user) {
            identify(s.user.id, { role });
            return { user: { ...s.user, role } };
          }
          return s;
        }),
      setLanguage: (language) => set({ language }),
      setFullName: (fullName) =>
        set((s) => (s.user ? { user: { ...s.user, fullName } } : s)),
      setAvatarId: (avatarId) =>
        set((s) => (s.user ? { user: { ...s.user, avatarId } } : s)),
      setGender: (gender) =>
        set((s) => (s.user ? { user: { ...s.user, gender } } : s)),
      logout: () => {
        // Reset PostHog so subsequent anonymous activity isn't attributed.
        resetAnalytics();
        set({ token: null, user: null });
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'cup-and-co.session',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, user: s.user, language: s.language }),
      onRehydrateStorage: () => (state) => {
        // Mark hydration complete so client components can safely branch.
        state?.setHydrated();
      },
    },
  ),
);

/** Read the JWT outside of React (e.g. in `lib/api.ts`). */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return useSession.getState().token;
}
