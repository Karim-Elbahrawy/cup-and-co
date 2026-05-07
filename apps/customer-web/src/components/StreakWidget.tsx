'use client';

/**
 * Home-screen streak widget — Phase 6.2 of UPGRADE-PLAN.md.
 *
 * Compact pill showing current streak + flame icon + "freeze" hint when
 * a skip is still available this week. Self-fetches; renders nothing
 * (zero-height) when streak is 0 so first-time users see no clutter.
 */

import { useEffect, useState } from 'react';
import { Flame, Snowflake } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { api, type StreakState } from '@/lib/api';
import { useT } from '@/lib/i18n';

export function StreakWidget() {
  const { language } = useT();
  const [state, setState] = useState<StreakState | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    api
      .myStreak()
      .then((res) => {
        if (!cancelled) setState(res.streak);
      })
      .catch(() => {
        if (!cancelled) setState(null);
      });
    return () => { cancelled = true; };
  }, []);

  if (!state || state.currentStreak === 0) return null;

  const isAtRisk = (() => {
    if (!state.lastOrderDate) return false;
    // If last order was 'today' the user is safe; if 'yesterday' and no
    // freeze used yet, they're in the warning zone.
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return state.lastOrderDate !== today;
  })();

  const copy = language === 'ar'
    ? {
        days: 'يوم',
        ariaLabel: `سلسلة طلبات: ${state.currentStreak} يوم`,
        frozenHint: 'تجميد متاح',
        atRisk: 'اطلب اليوم!',
        nextBonus: 'مكافأة بعد ${n} يوم',
      }
    : {
        days: state.currentStreak === 1 ? 'day' : 'days',
        ariaLabel: `Order streak: ${state.currentStreak} days`,
        frozenHint: 'Freeze available',
        atRisk: 'Order today!',
        nextBonus: '${n} to bonus',
      };

  const daysToNextBonus = 7 - (state.currentStreak % 7);
  const isOnBonusDay = state.currentStreak % 7 === 0;
  const hasFreeze = state.freezesUsedThisWeek === 0;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-label={copy.ariaLabel}
      className={[
        'flex items-center gap-3 rounded-card border px-4 py-3 shadow-card',
        isAtRisk
          ? 'border-[var(--cup-warning)]/40 bg-[var(--cup-warning)]/8'
          : 'border-[var(--cup-stroke)] bg-white',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          isAtRisk ? 'bg-[var(--cup-warning)]/15 text-[var(--cup-warning)]' : 'bg-[var(--cup-cream)] text-[var(--cup-primary)]',
        ].join(' ')}
        aria-hidden="true"
      >
        <Flame size={20} className={isOnBonusDay ? 'fill-current' : ''} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-base font-bold text-[var(--cup-espresso)]">
          {state.currentStreak} {copy.days}
        </p>
        <p className="text-xs text-[var(--cup-muted)]">
          {isAtRisk
            ? copy.atRisk
            : isOnBonusDay
              ? '+50 ⭐'
              : copy.nextBonus.replace('${n}', String(daysToNextBonus))}
        </p>
      </div>
      {hasFreeze && (
        <span
          className="inline-flex items-center gap-1 rounded-pill bg-[var(--cup-paper)] px-2 py-0.5 text-[10px] font-semibold text-[var(--cup-cocoa)]"
          title={copy.frozenHint}
          aria-label={copy.frozenHint}
        >
          <Snowflake size={11} aria-hidden="true" />
          {language === 'ar' ? '1' : '×1'}
        </span>
      )}
    </motion.div>
  );
}
