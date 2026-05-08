'use client';

import { useLang } from '@/lib/useLang';

/**
 * EN ↔ AR pill toggle (K1.6).
 *
 * Visible top-right on every customer-facing screen. One tap flips the
 * session language; the active option keeps a primary fill, the inactive
 * fades to muted. Shown side-by-side rather than as a single icon so the
 * customer can see both options at a glance — "this kiosk speaks Arabic
 * too" is itself a feature for the local market.
 *
 * Flag emoji + text label rather than just an icon — inclusive for
 * customers whose ar/en literacy differs from their flag-recognition.
 */
export function LanguageToggle() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);

  return (
    <div
      role="group"
      aria-label="Choose language"
      className="inline-flex items-center gap-1 rounded-pill bg-white p-1.5 shadow-card"
    >
      <Pill
        active={lang === 'en'}
        onClick={() => setLang('en')}
        aria-label="Switch to English"
      >
        <span aria-hidden="true">🇬🇧</span>
        <span>EN</span>
      </Pill>
      <Pill
        active={lang === 'ar'}
        onClick={() => setLang('ar')}
        aria-label="التحويل للعربية"
      >
        <span aria-hidden="true">🇪🇬</span>
        <span>AR</span>
      </Pill>
    </div>
  );
}

function Pill({
  active,
  children,
  ...rest
}: {
  active: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[
        'flex h-12 items-center gap-2 rounded-pill px-5 text-base font-bold transition',
        active
          ? 'bg-cup-primary text-white shadow-subtle'
          : 'bg-transparent text-[var(--cup-cocoa)] hover:bg-[var(--cup-paper)]',
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
