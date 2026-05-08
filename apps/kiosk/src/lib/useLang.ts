'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import type { KioskLang } from './lang';

/**
 * Session-only language store (K1.6).
 *
 * Defaults to EN, never persists. Idle reset calls `reset()` so the next
 * customer sees EN again — kiosks are shared hardware. We sync the chosen
 * language to <html lang> + <html dir> so screen readers + Tailwind's
 * direction-aware utilities (`me-3`, `ms-3`) flip correctly when AR is
 * picked.
 */
interface LangState {
  lang: KioskLang;
  setLang: (lang: KioskLang) => void;
  toggle: () => void;
  reset: () => void;
}

export const useLang = create<LangState>((set) => ({
  lang: 'en',
  setLang: (lang) => set({ lang }),
  toggle: () => set((s) => ({ lang: s.lang === 'en' ? 'ar' : 'en' })),
  reset: () => set({ lang: 'en' }),
}));

/**
 * Hook that mirrors the current language to the document's <html lang> +
 * <html dir> attributes. Mount once at the page root so every screen
 * benefits without prop drilling.
 */
export function useLangDocSync(): void {
  const lang = useLang((s) => s.lang);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
}
