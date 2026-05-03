import { getRequestConfig } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import { en, ar } from '@cup-and-co/i18n';

/**
 * `next-intl` is wired in `next.config.mjs` and runs for every server render.
 * Phase 1 doesn't yet use locale-prefixed routing — the language toggle on
 * the profile page mutates `<html lang>` client-side and our own `useT()`
 * hook in `src/lib/i18n.ts` does the lookups. This config exists so the
 * `next-intl` plugin compiles cleanly until Phase 6 swaps in proper
 * server-side locale routing.
 */
export default getRequestConfig(async ({ locale }) => {
  const resolved = locale === 'ar' ? 'ar' : 'en';
  const messages = (resolved === 'ar' ? ar : en) as unknown as AbstractIntlMessages;
  return { locale: resolved, messages };
});
