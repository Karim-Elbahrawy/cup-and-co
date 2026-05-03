import type { Translations } from './types';
import { en } from './en';
import { ar } from './ar';

const translations: Record<string, Translations> = { en, ar };

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedKeyOf<T[K]>}` }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Translations>;

export function getTranslation(locale: 'en' | 'ar', key: string): string {
  const t = translations[locale] ?? en;
  const keys = key.split('.');
  let value: unknown = t;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof value === 'string' ? value : key;
}
