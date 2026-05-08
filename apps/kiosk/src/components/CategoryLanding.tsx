'use client';

import { motion } from 'framer-motion';
import { Coffee, GlassWater, Sandwich, Cake, Leaf, ArrowRight } from 'lucide-react';
import {
  CATEGORY_GROUPS,
  type CategoryGroup,
  type GroupIconKind,
} from '@/lib/categoryGroups';
import type { KioskLang } from '@/lib/lang';

/**
 * Top-level category landing — 5 big tap targets, customer picks one of:
 * Coffee, Drinks, Breakfast, Dessert, Herbs.
 *
 * Visual reference: warm cream cards, oversized icon at top, label
 * underneath, accent ring on hover. The 5 cards span the full width
 * on a 12.9" iPad (5 columns at xl, 3 columns at md, 2 columns at
 * sm, 1 column tiny — covers the rare DevTools narrow preview).
 *
 * Each card is a real <button> for keyboard/screen-reader semantics.
 * Press feedback is GPU-only (active:scale + active:translate-y) —
 * Framer's stagger-in is the only JS-driven motion, on mount.
 */

interface CategoryLandingProps {
  lang: KioskLang;
  onSelect: (group: CategoryGroup) => void;
}

export function CategoryLanding({ lang, onSelect }: CategoryLandingProps) {
  return (
    <div className="space-y-8 pt-2">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.32em] text-[var(--cup-muted)]">
          {lang === 'ar' ? 'إيه اللي يعجبك؟' : 'What are you in the mood for?'}
        </p>
        <h2 className="mt-2 font-heading text-[44px] font-extrabold leading-tight tracking-tight text-[var(--cup-espresso)]">
          {lang === 'ar' ? 'اختار الفئة' : 'Pick a category'}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {CATEGORY_GROUPS.map((group, i) => (
          <motion.button
            key={group.id}
            type="button"
            onClick={() => onSelect(group)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.32,
              delay: i * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group relative flex min-h-[260px] flex-col items-center justify-between gap-5 overflow-hidden rounded-card border border-cup-stroke bg-white p-6 text-center shadow-card transition-[transform,box-shadow] duration-150 active:scale-[0.985] active:translate-y-px hover:shadow-elevated focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cup-primary"
          >
            {/* Decorative accent halo behind the icon — soft tinted blur,
                varies by group accent so the row reads with rhythm. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
              style={{ background: accentHaloFor(group.accent) }}
            />

            <span
              aria-hidden="true"
              className="relative z-10 grid h-24 w-24 place-items-center rounded-full"
              style={{
                background: accentSurfaceFor(group.accent),
                color: accentForeFor(group.accent),
              }}
            >
              <GroupIcon kind={group.icon} />
            </span>

            <div className="relative z-10 flex flex-1 flex-col items-center justify-end gap-1.5">
              <h3 className="font-heading text-[26px] font-extrabold leading-tight text-[var(--cup-espresso)]">
                {lang === 'ar' ? group.label.ar : group.label.en}
              </h3>
              <p className="font-body text-[15px] font-medium text-[var(--cup-muted)]">
                {lang === 'ar' ? group.hint.ar : group.hint.en}
              </p>
            </div>

            {/* Subtle progress affordance — the chevron quietly invites
                the next tap. RTL flips the direction. */}
            <span
              aria-hidden="true"
              className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--cup-paper)] text-[var(--cup-cocoa)] transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── icon dispatcher ─────────────────────────────────────────────────────

function GroupIcon({ kind }: { kind: GroupIconKind }) {
  const sizeProps = { className: 'h-12 w-12', strokeWidth: 1.6 };
  switch (kind) {
    case 'coffee':
      return <Coffee {...sizeProps} aria-hidden="true" />;
    case 'glass':
      return <GlassWater {...sizeProps} aria-hidden="true" />;
    case 'sandwich':
      return <Sandwich {...sizeProps} aria-hidden="true" />;
    case 'cake':
      return <Cake {...sizeProps} aria-hidden="true" />;
    case 'leaf':
      return <Leaf {...sizeProps} aria-hidden="true" />;
  }
}

// ── accent palette helpers ──────────────────────────────────────────────
//
// We intentionally use literal hex here (not Tailwind classes) so the
// halo + tint colors render reliably even if a Tailwind alias hasn't
// been added (the same root cause that hid the Checkout button before
// today's Tailwind config fix — defense-in-depth).

function accentHaloFor(a: CategoryGroup['accent']): string {
  switch (a) {
    case 'terracotta':
      return 'radial-gradient(closest-side, rgba(244,162,97,0.45) 0%, transparent 70%)';
    case 'teal':
      return 'radial-gradient(closest-side, rgba(45,212,191,0.32) 0%, transparent 70%)';
    case 'cream':
      return 'radial-gradient(closest-side, rgba(254,243,199,0.85) 0%, transparent 70%)';
    case 'cocoa':
      return 'radial-gradient(closest-side, rgba(68,64,60,0.18) 0%, transparent 70%)';
  }
}

function accentSurfaceFor(a: CategoryGroup['accent']): string {
  switch (a) {
    case 'terracotta':
      return 'linear-gradient(135deg, #F4A261 0%, #C2410C 100%)';
    case 'teal':
      return 'linear-gradient(135deg, #2DD4BF 0%, #0F766E 100%)';
    case 'cream':
      return 'linear-gradient(135deg, #FEF3C7 0%, #F4A261 100%)';
    case 'cocoa':
      return 'linear-gradient(135deg, #44403C 0%, #1C1917 100%)';
  }
}

function accentForeFor(a: CategoryGroup['accent']): string {
  switch (a) {
    case 'cream':
      return '#7C2D12'; // dark terracotta on cream — readable contrast
    default:
      return '#FFFFFF';
  }
}
