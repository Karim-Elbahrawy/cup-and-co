/**
 * Language helpers shared across the kiosk app.
 *
 * Per docs/KIOSK-PLAN.md K1.6 the kiosk supports EN ↔ AR with RTL. Selection
 * is per-session (cleared on idle reset) — there is no persisted user
 * preference because the kiosk is shared hardware. The actual store lives in
 * `useLangStore` (K1.6); this module owns just the type + the tiny pure
 * helpers so primitives can stay zustand-free.
 */

export type KioskLang = 'en' | 'ar';

/** Direction attribute for `<html dir>`. */
export function dirFor(lang: KioskLang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Pick the right localized field off a record that exposes `*_en` / `*_ar`.
 * Used for product names / descriptions / option labels coming from the
 * existing catalog API. Falls back to EN if the AR field is missing.
 */
export function localized<T extends string>(
  record: Record<string, unknown>,
  base: T,
  lang: KioskLang,
): string {
  const enKey = `${base}_en` as const;
  const arKey = `${base}_ar` as const;
  const en = String(record[enKey] ?? '');
  const ar = String(record[arKey] ?? '');
  return lang === 'ar' ? (ar || en) : en;
}
