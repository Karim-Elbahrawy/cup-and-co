'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ArrowRight, Flame, Snowflake, Wind } from 'lucide-react';
import type { CategoryGroup, SubGroup } from '@/lib/categoryGroups';
import type { KioskLang } from '@/lib/lang';

/**
 * Second-level picker. Only renders when the customer picked Coffee or
 * Drinks — those have sub-choices (Hot / Iced / Blended for coffee,
 * Hot / Cold for drinks). Single-leaf groups (Breakfast, Dessert, Herbs)
 * skip this surface entirely.
 *
 * Visually echoes CategoryLanding (cream cards, oversized icon, hint
 * text) but with two/three columns instead of five — the row reads as
 * "you've narrowed it down, now finish narrowing".
 *
 * The Back button is the same secondary BigButton-style chevron the
 * rest of the kiosk uses on its drill-down screens.
 */

interface SubgroupPickerProps {
  group: CategoryGroup;
  lang: KioskLang;
  onSelect: (subgroup: SubGroup) => void;
  onBack: () => void;
}

export function SubgroupPicker({
  group,
  lang,
  onSelect,
  onBack,
}: SubgroupPickerProps) {
  const subs = group.subgroups ?? [];

  return (
    <div className="space-y-7">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-pill bg-white px-5 py-2.5 font-heading text-base font-bold text-[var(--cup-cocoa)] shadow-subtle transition active:scale-[0.97] hover:bg-[var(--cup-paper)]"
      >
        <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
        {lang === 'ar' ? 'رجوع' : 'Back to categories'}
      </button>

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.32em] text-[var(--cup-muted)]">
          {lang === 'ar' ? group.label.ar : group.label.en}
        </p>
        <h2 className="mt-2 font-heading text-[44px] font-extrabold leading-tight tracking-tight text-[var(--cup-espresso)]">
          {lang === 'ar' ? 'اختار النوع' : 'Pick a style'}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {subs.map((sub, i) => (
          <motion.button
            key={sub.id}
            type="button"
            onClick={() => onSelect(sub)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group flex min-h-[220px] flex-col items-center justify-between gap-4 rounded-card border border-cup-stroke bg-white p-6 text-center shadow-card transition-[transform,box-shadow] duration-150 active:scale-[0.985] active:translate-y-px hover:shadow-elevated focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cup-primary"
          >
            <span
              aria-hidden="true"
              className="grid h-20 w-20 place-items-center rounded-full"
              style={{
                background: subSurfaceFor(sub.id),
                color: '#FFFFFF',
              }}
            >
              <SubIcon id={sub.id} />
            </span>

            <h3 className="font-heading text-[28px] font-extrabold leading-tight text-[var(--cup-espresso)]">
              {lang === 'ar' ? sub.label.ar : sub.label.en}
            </h3>

            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--cup-paper)] text-[var(--cup-cocoa)] transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── subgroup-specific accents ───────────────────────────────────────────

function SubIcon({ id }: { id: string }) {
  const props = { className: 'h-9 w-9', strokeWidth: 1.7 };
  switch (id) {
    case 'hot':
      return <Flame {...props} aria-hidden="true" />;
    case 'iced':
    case 'cold':
      return <Snowflake {...props} aria-hidden="true" />;
    case 'blended':
      return <Wind {...props} aria-hidden="true" />;
    default:
      return <Flame {...props} aria-hidden="true" />;
  }
}

function subSurfaceFor(id: string): string {
  switch (id) {
    case 'hot':
      return 'linear-gradient(135deg, #F4A261 0%, #C2410C 100%)';
    case 'iced':
    case 'cold':
      return 'linear-gradient(135deg, #2DD4BF 0%, #0F766E 100%)';
    case 'blended':
      return 'linear-gradient(135deg, #A8A29E 0%, #44403C 100%)';
    default:
      return 'linear-gradient(135deg, #F4A261 0%, #C2410C 100%)';
  }
}
