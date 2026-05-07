'use client';

/**
 * Theme provider — Phase 8.2 of UPGRADE-PLAN.md.
 *
 * Three-way theme model: 'system' | 'light' | 'dark'.
 *
 * - 'system' (default for new users) follows `prefers-color-scheme`
 *   and updates live when the user changes their OS theme. The CSS
 *   media query in globals.css handles SSR / pre-hydration paint
 *   so there's no flash.
 * - 'light' / 'dark' are explicit overrides that set
 *   `<html data-theme="light|dark">` and persist to localStorage.
 *
 * Anti-flash strategy: an inline script in the document head reads
 * localStorage and applies the data-theme attribute *before* React
 * hydrates. We inject that script via `<ThemeBootstrap />` rendered
 * in the root layout. This avoids the dreaded white-flash-then-dark.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'cup-co-theme';

interface ThemeContextValue {
  /** What the user explicitly picked, or 'system'. */
  choice: ThemeChoice;
  /** What's actually rendering right now. */
  resolved: ResolvedTheme;
  setChoice: (next: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* localStorage blocked */
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyToHtml(resolved: ResolvedTheme, choice: ThemeChoice): void {
  if (typeof document === 'undefined') return;
  // 'system' clears the attribute so the @media query in globals.css
  // takes over. Manual choices set the attribute explicitly so the
  // override styles apply regardless of OS preference.
  if (choice === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', resolved);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  // Initial mount — read the stored choice and sync.
  useEffect(() => {
    const stored = readStoredChoice();
    const next = stored === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : stored;
    setChoiceState(stored);
    setResolved(next);
    applyToHtml(next, stored);
  }, []);

  // Watch system preference when the user is on 'system'.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolved(next);
      applyToHtml(next, 'system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [choice]);

  function setChoice(next: ThemeChoice) {
    setChoiceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage blocked — choice still applies for this session */
    }
    const resolvedNext: ResolvedTheme =
      next === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : next;
    setResolved(resolvedNext);
    applyToHtml(resolvedNext, next);
  }

  return (
    <ThemeContext.Provider value={{ choice, resolved, setChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/**
 * Inline script tag that reads the stored choice and applies the
 * data-theme attribute BEFORE React hydrates. Prevents the
 * white-flash-then-dark on initial paint when the user has chosen
 * dark or when their OS prefers dark.
 *
 * Render this in the root <head> as `<ThemeBootstrap />`. The script
 * is intentionally minimal; it duplicates the read+resolve+apply
 * logic above so it can run in vanilla JS before React loads.
 */
export function ThemeBootstrap() {
  const script = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var resolved = stored;
    if (stored !== 'light' && stored !== 'dark') {
      stored = 'system';
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (stored === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', resolved);
    }
  } catch (e) {}
})();
`.trim();
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
