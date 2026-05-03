'use client';

import { useState } from 'react';

interface KioskToggleProps {
  initialOpen?: boolean;
  /** Optional async hook — if it throws we revert. For now it's a stub. */
  onChange?: (open: boolean) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Open/Closed pill toggle for the kiosk.
 *
 * The API endpoint `/admin/kiosk/status` doesn't exist yet — Phase 2 brings it.
 * In the meantime this stays a UI-only control with optimistic local state, so
 * staff can preview the interaction. The `onChange` prop is wired through but
 * left a no-op at the call sites for now.
 */
export function KioskToggle({ initialOpen = true, onChange, disabled = false }: KioskToggleProps) {
  const [open, setOpen] = useState(initialOpen);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (disabled || pending) return;
    const target = !open;
    setOpen(target);
    setPending(true);
    try {
      await onChange?.(target);
    } catch {
      // Revert on failure — caller is expected to surface the toast.
      setOpen(!target);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={open}
      onClick={toggle}
      disabled={disabled || pending}
      className={`group inline-flex items-center gap-3 rounded-pill border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        open
          ? 'border-cup-teal-200 bg-cup-teal-100 text-cup-teal-700'
          : 'border-cup-stroke bg-cup-brown-100 text-cup-brown-700'
      }`}
    >
      <span
        className={`relative inline-block h-4 w-7 rounded-pill transition ${
          open ? 'bg-cup-teal-700' : 'bg-cup-brown-400'
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition-all ${
            open ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
      <span>{open ? 'Open' : 'Closed'}</span>
    </button>
  );
}
