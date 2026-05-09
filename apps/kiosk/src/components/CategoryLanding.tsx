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
 * Top-level category landing — refined to match Karim's reference image.
 *
 * Visual reference: a single warm cream "tray" containing a small uppercase
 * title and a tight horizontal row of sticker-style category chips. Each
 * chip is a rounded square with a soft drop shadow, brand-tinted gradient
 * fill, white centred icon, and a small uppercase label below.
 *
 * Why one tray instead of 5 separate cards: the 5-card grid felt loose and
 * SaaS-y. The reference is calmer — one composed surface, the eye reads
 * left-to-right across the chips, picks one, taps. Less visual chrome per
 * unit of choice.
 *
 * Each chip is a real <button> for keyboard / screen-reader semantics.
 * Press feedback is GPU-only (active:scale + active:translate-y); only
 * Framer-driven motion is the stagger-in on mount.
 */

interface CategoryLandingProps {
  lang: KioskLang;
  onSelect: (group: CategoryGroup) => void;
}

export function CategoryLanding({ lang, onSelect }: CategoryLandingProps) {
  return (
    <div className="grid place-items-center pt-2">
      {/* The tray — single cream container holds all 5 chips + the title. */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        aria-label={lang === 'ar' ? 'اختار الفئة' : 'Pick a category'}
        className="relative w-full max-w-[1280px] overflow-hidden rounded-[44px] border border-[#E9E1CF] px-10 py-12 shadow-[0_18px_60px_rgba(28,25,23,0.08)]"
        style={{
          background: 'linear-gradient(180deg, #FFFAF0 0%, #FCF1DE 100%)',
        }}
      >
        {/* Tray title — small caps centered, matches the reference. */}
        <header className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.4em] text-[var(--cup-cocoa)]">
            {lang === 'ar' ? 'اختار من القائمة' : 'Choose from the menu'}
          </p>
          <h2 className="mt-3 font-heading text-[40px] font-extrabold leading-tight tracking-tight text-[var(--cup-espresso)]">
            {lang === 'ar' ? 'إيه اللي يعجبك؟' : "What's calling you?"}
          </h2>
        </header>

        {/* Sticker row — 5 chips in a fluid grid that compacts on narrow
            previews. On a 12.9" iPad in landscape this lands as a single
            row of 5; in portrait it falls to 3 → 2 → 1. */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-5">
          {CATEGORY_GROUPS.map((group, i) => (
            <motion.button
              key={group.id}
              type="button"
              onClick={() => onSelect(group)}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.32,
                delay: 0.08 + i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              aria-label={lang === 'ar' ? group.label.ar : group.label.en}
              className="group flex flex-col items-center gap-3 rounded-[28px] bg-transparent p-2 transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cup-primary"
            >
              {/* The sticker — rounded square with brand-tinted gradient,
                  white icon centered, soft drop shadow, plus a tiny inset
                  highlight at the top to pick up the "ceramic" feel of
                  the reference. */}
              <span
                aria-hidden="true"
                className="relative grid h-[120px] w-[120px] place-items-center overflow-hidden rounded-[28px] shadow-[0_10px_24px_rgba(28,25,23,0.10)] transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_32px_rgba(28,25,23,0.14)]"
                style={{
                  background: stickerSurfaceFor(group.accent),
                  color: stickerIconColorFor(group.accent),
                }}
              >
                {/* Inner highlight — top-curve sheen, gives the sticker
                    a 3D ceramic feel without an actual illustration. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 top-2 h-1/3 rounded-[20px] opacity-50"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
                  }}
                />
                <GroupIcon kind={group.icon} />
              </span>

              {/* Label — uppercase + letter-spaced, matching the small caps
                  in the reference. */}
              <span className="font-heading text-[15px] font-extrabold uppercase tracking-[0.18em] text-[var(--cup-cocoa)] group-hover:text-[var(--cup-espresso)]">
                {lang === 'ar' ? group.label.ar : group.label.en}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Footer hint — invites the tap with a directional chevron, kept
            subtle so it doesn't compete with the chip row. */}
        <p className="mt-9 inline-flex w-full items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.32em] text-[var(--cup-muted)]">
          {lang === 'ar' ? 'دوس على فئة' : 'Tap a category'}
          <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
        </p>
      </motion.section>
    </div>
  );
}

// ── icon dispatcher ─────────────────────────────────────────────────────

function GroupIcon({ kind }: { kind: GroupIconKind }) {
  // Slightly thicker stroke than the previous version — reads better at
  // sticker scale (~52px effective glyph in a 120px chip).
  const sizeProps = { className: 'h-14 w-14', strokeWidth: 1.7 };
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

// ── sticker palette ─────────────────────────────────────────────────────
//
// Each accent gets a custom 2-stop diagonal gradient that's been hand-tuned
// to read well at sticker scale (small chip, no text inside). All of them
// keep enough contrast against the cream tray so the row reads as a
// composed object rather than five floating shapes.

function stickerSurfaceFor(a: CategoryGroup['accent']): string {
  switch (a) {
    case 'terracotta':
      return 'linear-gradient(155deg, #F4A261 0%, #C2410C 100%)';
    case 'teal':
      return 'linear-gradient(155deg, #5EEAD4 0%, #0F766E 100%)';
    case 'cream':
      // Cream tray + cream sticker would disappear, so this is the warmest
      // butter→honey tone instead — still on-brand.
      return 'linear-gradient(155deg, #FBBF24 0%, #C2810C 100%)';
    case 'cocoa':
      return 'linear-gradient(155deg, #78716C 0%, #1C1917 100%)';
  }
}

function stickerIconColorFor(a: CategoryGroup['accent']): string {
  // White everywhere — the gradient backgrounds are dark enough at the
  // 100% stop that the icon reads cleanly. Cream variant goes white too
  // because we shifted it to butter→honey above.
  return '#FFFFFF';
  void a;
}
