'use client';

import { useEffect } from 'react';
import { useSession } from '@/lib/session';

/**
 * Keeps the `<html lang>` + `<html dir>` attributes in sync with the user's
 * language preference. Mounted once at the root layout. Full RTL audit lands
 * in Phase 6, but this gives the structure a first-class language switch.
 */
export function HtmlLangSync() {
  const language = useSession((s) => s.language);
  const hydrated = useSession((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language, hydrated]);

  return null;
}
