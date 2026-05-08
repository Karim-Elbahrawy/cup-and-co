'use client';

import type { ProductOption, OptionGroup } from '@cup-and-co/types';
import type { KioskLang } from '@/lib/lang';

/**
 * One row of option chips for a single OptionGroup (size / sugar / ice / …).
 *
 * Selection model: each group has at most one selected option (single-select)
 * for now — the seed data backs this assumption. If a future product needs
 * multi-select extras (e.g. add cinnamon AND vanilla) we'd extend by
 * accepting `Set<string>` instead of a scalar; out of scope for K1.3.
 *
 * Visual: chips inherit BigButton's visual language but render as a
 * single-select group, so we don't reuse BigButton (different aria role +
 * different selected state). Selected chip = primary border + cream-tint
 * fill, matching the reference image.
 */

interface OptionGroupRowProps {
  group: OptionGroup;
  options: ProductOption[];
  selectedOptionId: string | null;
  lang: KioskLang;
  onSelect: (optionId: string) => void;
}

const GROUP_LABEL_EN: Record<OptionGroup, string> = {
  size: 'Size',
  shots: 'Shots',
  sugar: 'Sugar',
  ice: 'Ice',
  milk: 'Milk',
  extras: 'Extras',
};

const GROUP_LABEL_AR: Record<OptionGroup, string> = {
  size: 'الحجم',
  shots: 'الجرعات',
  sugar: 'السكر',
  ice: 'الثلج',
  milk: 'الحليب',
  extras: 'إضافات',
};

export function OptionGroupRow({
  group,
  options,
  selectedOptionId,
  lang,
  onSelect,
}: OptionGroupRowProps) {
  const heading = lang === 'ar' ? GROUP_LABEL_AR[group] : GROUP_LABEL_EN[group];

  return (
    <section aria-labelledby={`opt-${group}`} className="mb-8">
      <h3
        id={`opt-${group}`}
        className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-[var(--cup-muted)]"
      >
        {heading}
      </h3>
      <div role="radiogroup" className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const active = opt.id === selectedOptionId;
          const label = lang === 'ar' ? opt.name_ar : opt.name_en;
          const delta = opt.price_delta_egp;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(opt.id)}
              className={[
                'min-h-touch-btn rounded-pill border-2 px-6 font-heading text-k-card font-bold transition',
                'active:scale-[0.97]',
                active
                  ? 'border-cup-primary bg-[var(--cup-primary-tint)] text-[var(--cup-espresso)]'
                  : 'border-[var(--cup-stroke)] bg-white text-[var(--cup-cocoa)] hover:bg-[var(--cup-paper)]',
              ].join(' ')}
            >
              <span>{label}</span>
              {delta !== 0 ? (
                <span
                  className={[
                    'ms-3 text-base font-semibold',
                    active ? 'text-[var(--cup-primary)]' : 'text-[var(--cup-muted)]',
                  ].join(' ')}
                >
                  {delta > 0 ? `+${delta}` : delta} EGP
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
