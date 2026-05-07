'use client';

/**
 * Campus selector dropdown shown in the admin sidebar header.
 *
 * Visual states:
 *   - Loading        — skeleton pill while /campuses fetches
 *   - One campus     — informational pill, no menu (most v1.5 deployments)
 *   - Many campuses  — interactive dropdown
 *   - Error          — silent (we don't block the admin UI on this)
 *
 * Phase 2.3 of UPGRADE-PLAN.md.
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, MapPin } from 'lucide-react';
import { useCampus } from './CampusProvider';

interface CampusSwitcherProps {
  /**
   * `'rail'` — compact icon-only at md breakpoint (matches Sidebar rail variant);
   *            full pill at lg+.
   * `'drawer'` — always full pill (used inside the mobile slide-over).
   */
  variant?: 'rail' | 'drawer';
}

export function CampusSwitcher({ variant = 'rail' }: CampusSwitcherProps) {
  const { campuses, current, setCampusId, ready } = useCampus();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isDrawer = variant === 'drawer';
  const labelClass = isDrawer ? 'inline' : 'hidden lg:inline';

  if (!ready) {
    return (
      <div
        className="flex h-9 items-center gap-2 rounded-pill border border-cup-stroke bg-cup-cream-100 px-3"
        aria-label="Loading campuses"
      >
        <MapPin className="h-4 w-4 text-cup-muted" aria-hidden />
        <span className={`text-xs font-medium text-cup-muted ${labelClass}`}>Loading…</span>
      </div>
    );
  }

  if (!current) {
    // No campus available — show a faint placeholder so layout doesn't shift.
    return (
      <div
        className="flex h-9 items-center gap-2 rounded-pill border border-cup-stroke bg-cup-paper px-3"
        aria-label="No campus available"
      >
        <MapPin className="h-4 w-4 text-cup-muted" aria-hidden />
        <span className={`text-xs font-medium text-cup-muted ${labelClass}`}>No campus</span>
      </div>
    );
  }

  const active = campuses?.filter((c) => c.is_active) ?? [];
  const onlyOne = active.length <= 1;

  if (onlyOne) {
    return (
      <div
        className="flex h-9 items-center gap-2 rounded-pill border border-cup-stroke bg-white px-3 text-cup-brown-700"
        aria-label={`Current campus: ${current.name_en}`}
        title={current.name_en}
      >
        <MapPin className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <span className={`max-w-[140px] truncate text-xs font-semibold ${labelClass}`}>
          {current.name_en}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch campus"
        title={current.name_en}
        className="flex h-9 items-center gap-2 rounded-pill border border-cup-stroke bg-white px-3 text-cup-brown-700 transition hover:border-cup-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
      >
        <MapPin className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <span className={`max-w-[140px] truncate text-xs font-semibold ${labelClass}`}>
          {current.name_en}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-cup-muted ${labelClass}`} aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Active campuses"
          className="absolute end-0 top-11 z-50 max-h-72 w-64 overflow-y-auto rounded-card border border-cup-stroke bg-white p-1 shadow-elevated"
        >
          {active.map((c) => {
            const selected = c.id === current.id;
            return (
              <li key={c.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setCampusId(c.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-chip px-2.5 py-2 text-start text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 ${
                    selected ? 'bg-cup-cream-100 text-cup-orange-700' : 'text-cup-brown-700 hover:bg-cup-paper'
                  }`}
                >
                  <span className="flex-1 truncate font-medium">{c.name_en}</span>
                  <span className="text-[10px] uppercase tracking-wider text-cup-muted">
                    {c.timezone}
                  </span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-cup-orange-600" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
