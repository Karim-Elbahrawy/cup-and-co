'use client';

/**
 * Tiny welcome-back pill rendered above the home greeting. Demo target for
 * the `welcome_banner` feature flag — when the user buckets into
 * `variant_a` they see this; `control` users see nothing.
 *
 * Kept self-contained (no extra i18n keys) so the flag system can ship
 * without dragging in cross-package changes. If we promote this to a
 * permanent UI element later, fold the strings into `packages/i18n`.
 */

import { Sparkles } from 'lucide-react';

interface WelcomeBackBannerProps {
  /** First name (or fallback handle) to greet. */
  name: string;
  /** Active language. Drives the copy + RTL alignment. */
  language: 'en' | 'ar';
}

export function WelcomeBackBanner({ name, language }: WelcomeBackBannerProps) {
  const copy =
    language === 'ar'
      ? `حمداً لله على السلامة، ${name} ☕`
      : `Welcome back, ${name} ☕`;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="welcome-back-banner"
      className="inline-flex items-center gap-2 self-start rounded-pill bg-[var(--cup-cream)] px-3 py-1.5 text-xs font-semibold text-[var(--cup-primary)] shadow-subtle"
    >
      <Sparkles size={12} aria-hidden="true" />
      <span>{copy}</span>
    </div>
  );
}
