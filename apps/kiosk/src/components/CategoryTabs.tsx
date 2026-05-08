'use client';

import type { Category } from '@cup-and-co/types';
import type { KioskLang } from '@/lib/lang';

/**
 * Horizontal scrollable category chip row. The pseudo-category 'all' is
 * always rendered first; remaining chips track `categories` from the API
 * (sorted by `sort_order` server-side).
 *
 * Touch behaviour:
 *   - 88pt-tall chips so a fingertip lands on exactly one
 *   - Active chip uses terracotta fill + white text; inactive chips use
 *     paper background with espresso text
 *   - The wrapper allows horizontal scroll on overflow but uses
 *     `scrollbar-hide` so no scrollbar shows on touch — the dragged-edge
 *     fade gives visual affordance instead.
 */

interface CategoryTabsProps {
  categories: Category[];
  selected: string | 'all';
  lang: KioskLang;
  onSelect: (id: string | 'all') => void;
}

export function CategoryTabs({
  categories,
  selected,
  lang,
  onSelect,
}: CategoryTabsProps) {
  return (
    <div className="relative">
      <div
        role="tablist"
        aria-label="Categories"
        className="scrollbar-hide flex gap-3 overflow-x-auto pb-2"
      >
        <Chip
          label={lang === 'ar' ? 'الكل' : 'All'}
          active={selected === 'all'}
          onClick={() => onSelect('all')}
        />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={lang === 'ar' ? c.name_ar : c.name_en}
            active={selected === c.id}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'min-h-touch-btn flex-shrink-0 rounded-pill px-7 font-heading text-k-card font-bold transition',
        'active:scale-[0.97]',
        active
          ? 'bg-cup-primary text-white shadow-card'
          : 'bg-white text-[var(--cup-espresso)] border-2 border-[var(--cup-stroke)] hover:bg-[var(--cup-paper)]',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
