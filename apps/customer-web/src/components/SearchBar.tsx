'use client';

import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
}

/**
 * Pill-shaped search input with a leading magnifier icon and a separate
 * solid filter button on the right. Mirrors the Figma reference but with the
 * upgraded terracotta accent.
 */
export function SearchBar({ value, onChange, placeholder = 'Search', onFilterClick }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="relative flex flex-1 items-center">
        <span className="pointer-events-none absolute start-4 text-[var(--cup-muted)]">
          <Search size={18} aria-hidden="true" />
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-12 w-full rounded-pill border border-[var(--cup-stroke)] bg-white ps-12 pe-4 text-sm font-medium text-[var(--cup-espresso)] placeholder:text-[var(--cup-muted)] outline-none transition-all focus:border-[var(--cup-primary)] focus:shadow-[0_0_0_4px_rgba(194,65,12,0.10)]"
        />
      </label>
      <button
        type="button"
        onClick={onFilterClick}
        aria-label="Filters"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--cup-primary)] text-white shadow-[0_8px_24px_rgba(194,65,12,0.18)] transition-transform active:scale-95 hover:bg-[var(--cup-primary-hover)]"
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
