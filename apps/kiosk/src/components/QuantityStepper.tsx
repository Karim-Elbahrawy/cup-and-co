'use client';

import { Minus, Plus } from 'lucide-react';

/**
 * Quantity stepper for the product detail screen (K1.3) and the cart drawer
 * (K1.5). Two big circular buttons either side of a count.
 *
 * Constraints:
 *   - min defaults to 1 on detail (you can't add 0 of something)
 *   - max defaults to 9 — that's the deepest pour-volume any single line
 *     reasonably hits at a counter; cart total can grow much larger via
 *     additional lines. Stops a stuck-finger-on-plus from sending an
 *     "order 89 lattes" to the kitchen.
 */

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Larger size used on the detail screen; default fits cart rows. */
  size?: 'md' | 'lg';
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 9,
  size = 'md',
}: QuantityStepperProps) {
  const decDisabled = value <= min;
  const incDisabled = value >= max;

  const btn =
    size === 'lg'
      ? 'h-16 w-16'
      : 'h-12 w-12';
  const num =
    size === 'lg'
      ? 'min-w-[72px] text-[40px]'
      : 'min-w-[44px] text-[28px]';

  return (
    <div
      role="group"
      aria-label="Quantity"
      className="inline-flex items-center gap-2 rounded-pill bg-white p-1.5 shadow-card"
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={decDisabled}
        aria-label="Decrease quantity"
        className={`${btn} grid place-items-center rounded-full bg-[var(--cup-paper)] text-[var(--cup-espresso)] transition active:scale-[0.94] disabled:opacity-40`}
      >
        <Minus className="h-7 w-7" strokeWidth={2.5} />
      </button>
      <span
        className={`${num} text-center font-heading font-extrabold text-[var(--cup-espresso)]`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={incDisabled}
        aria-label="Increase quantity"
        className={`${btn} grid place-items-center rounded-full bg-cup-primary text-white transition active:scale-[0.94] disabled:opacity-40`}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>
    </div>
  );
}
