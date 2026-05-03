'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface PromoCardProps {
  eyebrow: string;
  headline: string;
  subtitle: string;
  ctaLabel: string;
  onCtaClick?: () => void;
}

/**
 * Hero promo card. Uses the `cup-sunrise` gradient utility for the surface,
 * a generous 20px radius, warm terracotta-tinted shadow, and two slowly
 * pulsing decorative blobs. Respects `prefers-reduced-motion`.
 */
export function PromoCard({ eyebrow, headline, subtitle, ctaLabel, onCtaClick }: PromoCardProps) {
  const reduce = useReducedMotion();

  return (
    <section
      className="cup-sunrise relative overflow-hidden rounded-[20px] p-6 text-white shadow-[0_12px_32px_rgba(194,65,12,0.22)]"
      aria-label="Promotional offer"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] opacity-95">{eyebrow}</p>
      <p className="mt-1.5 font-heading text-4xl font-bold leading-tight tracking-tight">{headline}</p>
      <p className="mt-1 text-sm opacity-95">{subtitle}</p>
      <button
        type="button"
        onClick={onCtaClick}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--cup-primary)] shadow-[0_4px_12px_rgba(28,25,23,0.15)] transition-all hover:bg-[var(--cup-cream)] active:scale-[0.97]"
      >
        {ctaLabel}
        <span aria-hidden="true">→</span>
      </button>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl"
        animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        animate={reduce ? undefined : { scale: [1.05, 0.95, 1.05], opacity: [0.4, 0.6, 0.4] }}
        transition={reduce ? undefined : { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />
    </section>
  );
}
