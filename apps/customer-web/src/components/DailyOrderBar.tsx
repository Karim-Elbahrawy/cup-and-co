'use client';

import Link from 'next/link';
import { Repeat2, Search, SlidersHorizontal, Sparkles } from 'lucide-react';

interface DailyOrderBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onFilterClick?: () => void;
}

/**
 * Replaces the plain search bar on the home screen.
 * Top row: two quick-action shortcuts that build the daily ordering habit.
 * Bottom row: the standard search + filter input for menu browsing.
 */
export function DailyOrderBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  onFilterClick,
}: DailyOrderBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Quick-order shortcuts */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Your Usual */}
        <Link
          href="/usual"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#F4A261] to-[#C2410C] p-3.5 shadow-[0_8px_22px_rgba(194,65,12,0.28)] transition active:scale-[0.97]"
        >
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-xl" />
          <Repeat2
            size={18}
            className="text-white/90"
            aria-hidden="true"
          />
          <div className="mt-6">
            <p className="font-heading text-sm font-bold leading-tight text-white">
              Your Usual
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-white/80">
              Reorder in 1 tap →
            </p>
          </div>
        </Link>

        {/* New custom order */}
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            // Scroll to the product grid below
            document.getElementById('popular-heading')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group flex flex-col justify-between rounded-2xl border-2 border-[var(--cup-stroke)] bg-white p-3.5 transition hover:border-[var(--cup-primary-tint)] active:scale-[0.97]"
        >
          <Sparkles
            size={18}
            className="text-[var(--cup-primary)]"
            aria-hidden="true"
          />
          <div className="mt-6">
            <p className="font-heading text-sm font-bold leading-tight text-[var(--cup-espresso)]">
              New Order
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--cup-muted)]">
              Browse &amp; build →
            </p>
          </div>
        </Link>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-3">
        <label className="relative flex flex-1 items-center">
          <span className="pointer-events-none absolute start-4 text-[var(--cup-muted)]">
            <Search size={17} aria-hidden="true" />
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-11 w-full rounded-pill border border-[var(--cup-stroke)] bg-white ps-11 pe-4 text-sm font-medium text-[var(--cup-espresso)] placeholder:text-[var(--cup-muted)] outline-none transition-all focus:border-[var(--cup-primary)] focus:shadow-[0_0_0_4px_rgba(194,65,12,0.09)]"
          />
        </label>
        <button
          type="button"
          onClick={onFilterClick}
          aria-label="Filters"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cup-primary)] text-white shadow-[0_6px_18px_rgba(194,65,12,0.18)] transition-transform active:scale-95 hover:bg-[var(--cup-primary-hover)]"
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
