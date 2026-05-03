'use client';

import { useMemo } from 'react';
import { en, ar, type Translations } from '@cup-and-co/i18n';
import { useSession, type Language } from './session';

const dictionaries: Record<Language, Translations> = { en, ar };

/**
 * Lightweight client-side translation hook driven by the session store. Full
 * RTL audit and `next-intl`-driven static translations land in Phase 6 — for
 * now this gives every component a single `t('...')` lookup with the same
 * dot-notation keys used in `@cup-and-co/i18n`.
 */
export function useT() {
  const language = useSession((s) => s.language);
  const t = useMemo(() => makeTranslator(language), [language]);
  return { t, language };
}

export function makeTranslator(language: Language) {
  const dict = dictionaries[language] ?? dictionaries.en;
  return (key: string): string => {
    const parts = key.split('.');
    let cursor: unknown = dict;
    for (const part of parts) {
      if (cursor && typeof cursor === 'object' && part in cursor) {
        cursor = (cursor as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof cursor === 'string' ? cursor : key;
  };
}

/** Pick the language-appropriate field from a bilingual record. */
export function pickName<T extends { name_en: string; name_ar: string }>(
  item: T,
  language: Language,
): string {
  return language === 'ar' ? item.name_ar || item.name_en : item.name_en;
}

export function pickDescription(
  item: { description_en: string; description_ar: string },
  language: Language,
): string {
  return language === 'ar' ? item.description_ar || item.description_en : item.description_en;
}

/** Format a price as `EGP 65` / `٦٥ ج.م` depending on language. */
export function formatPrice(amount: number, language: Language): string {
  if (language === 'ar') {
    return `${amount.toLocaleString('ar-EG')} ج.م`;
  }
  return `EGP ${amount.toLocaleString('en-US')}`;
}
