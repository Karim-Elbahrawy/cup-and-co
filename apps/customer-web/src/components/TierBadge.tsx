'use client';

/**
 * Tier badge — Phase 6.3 of UPGRADE-PLAN.md.
 *
 * Compact pill showing the user's current loyalty tier with the
 * tier-specific gradient + trophy icon. Sized small/md/lg via prop.
 *
 * Bronze:  #CD7F32  (warm bronze)
 * Silver:  #C0C0C0  (cool silver)
 * Gold:    #FFD700  (yellow gold)
 *
 * The progress bar variant (`<TierProgress>`) shows
 * "X pts to Silver" and ships in the same module so the profile
 * page imports both from one place.
 */

import { Trophy } from 'lucide-react';
import type { LoyaltyTier } from '@/lib/api';

const TIER_PALETTE: Record<LoyaltyTier, { from: string; to: string; ring: string; text: string; label: { en: string; ar: string } }> = {
  bronze: {
    from: '#CD7F32',
    to: '#A0531D',
    ring: 'rgba(205, 127, 50, 0.35)',
    text: '#FFFFFF',
    label: { en: 'Bronze', ar: 'برونزي' },
  },
  silver: {
    from: '#E5E5E5',
    to: '#A8A8A8',
    ring: 'rgba(192, 192, 192, 0.45)',
    text: '#1C1917',
    label: { en: 'Silver', ar: 'فضي' },
  },
  gold: {
    from: '#FFD700',
    to: '#D4A100',
    ring: 'rgba(255, 215, 0, 0.5)',
    text: '#1C1917',
    label: { en: 'Gold', ar: 'ذهبي' },
  },
};

export interface TierBadgeProps {
  tier: LoyaltyTier;
  size?: 'sm' | 'md' | 'lg';
  language?: 'en' | 'ar';
  className?: string;
}

export function TierBadge({ tier, size = 'md', language = 'en', className = '' }: TierBadgeProps) {
  const p = TIER_PALETTE[tier];
  const dims = {
    sm: { px: 'px-2 py-0.5', text: 'text-[10px]', icon: 11, gap: 'gap-1' },
    md: { px: 'px-2.5 py-1', text: 'text-xs', icon: 13, gap: 'gap-1.5' },
    lg: { px: 'px-3 py-1.5', text: 'text-sm', icon: 16, gap: 'gap-2' },
  }[size];

  return (
    <span
      role="status"
      aria-label={`${p.label[language]} tier`}
      className={[
        'inline-flex items-center rounded-pill font-bold uppercase tracking-wider shadow-subtle',
        dims.px,
        dims.text,
        dims.gap,
        className,
      ].join(' ')}
      style={{
        background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
        color: p.text,
        boxShadow: `0 2px 8px ${p.ring}`,
      }}
    >
      <Trophy size={dims.icon} aria-hidden="true" className="shrink-0" />
      {p.label[language]}
    </span>
  );
}

/**
 * Progress bar showing how close the user is to the next tier.
 * Renders nothing when nextTier is null (already at Gold).
 */
export function TierProgress({
  currentTier,
  nextTier,
  trailing12mPoints,
  pointsToNext,
  language = 'en',
}: {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  trailing12mPoints: number;
  pointsToNext: number | null;
  language?: 'en' | 'ar';
}) {
  if (nextTier === null || pointsToNext === null) {
    return (
      <p className="text-xs text-[var(--cup-muted)]">
        {language === 'ar' ? 'وصلت لأعلى مستوى — استمتع بمكافآت الذهب 🏆' : 'You’ve hit the top tier. Enjoy the Gold perks 🏆'}
      </p>
    );
  }
  const lower = currentTier === 'bronze' ? 0 : 500;
  const upper = nextTier === 'silver' ? 500 : 2000;
  const progress = Math.max(0, Math.min(1, (trailing12mPoints - lower) / (upper - lower)));
  const nextLabel = TIER_PALETTE[nextTier].label[language];
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-[var(--cup-cocoa)]">
          {trailing12mPoints} / {upper}
        </span>
        <span className="text-[var(--cup-muted)]">
          {language === 'ar' ? `${pointsToNext} نقطة لـ ${nextLabel}` : `${pointsToNext} pts to ${nextLabel}`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-pill bg-[var(--cup-stroke)]"
        role="progressbar"
        aria-valuemin={lower}
        aria-valuemax={upper}
        aria-valuenow={trailing12mPoints}
      >
        <div
          className="h-full rounded-pill transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${TIER_PALETTE[currentTier].from}, ${TIER_PALETTE[nextTier].from})`,
          }}
        />
      </div>
    </div>
  );
}
