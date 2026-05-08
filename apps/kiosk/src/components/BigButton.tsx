'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/**
 * Kiosk big-touch button primitive.
 *
 * Targets per docs/KIOSK-PLAN.md K0.3 — minimum 88×88pt hit area, large
 * type, generous corner radius. Three variants:
 *   - 'primary'   — filled terracotta, used for the dominant CTA per screen
 *   - 'secondary' — outlined cream, used for "back" / "cancel" affordances
 *   - 'ghost'     — text-only, used inside drawers and confirmation modals
 *
 * Visual press feedback is intentionally CSS-only (active:scale + active:
 * brightness) rather than Framer Motion — we want zero JS work between the
 * touchstart event and the visible response. Anything more is too sluggish
 * on Safari iPad after a few hundred orders.
 */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'lg' | 'xl';

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-cup-primary text-white shadow-card hover:bg-cup-primary-hover ' +
    'active:brightness-95',
  secondary:
    'bg-white text-[var(--cup-espresso)] border-2 border-[var(--cup-stroke)] ' +
    'hover:bg-[var(--cup-paper)] active:brightness-95',
  ghost:
    'bg-transparent text-[var(--cup-cocoa)] hover:bg-[var(--cup-paper)] ' +
    'active:brightness-95',
};

const SIZE_CLASSES: Record<Size, string> = {
  // 88pt minimum (K0.3 acceptance), padded for finger-tip taps in landscape.
  lg: 'min-h-touch-btn px-8 text-k-card',
  // Hero CTA — the "ADD TO ORDER" button on product detail (K1.3).
  xl: 'min-h-[112px] px-12 text-[32px] tracking-[-0.01em]',
};

export const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(
  function BigButton(
    {
      variant = 'primary',
      size = 'lg',
      leadingIcon,
      trailingIcon,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={[
          'inline-flex select-none items-center justify-center gap-3 rounded-pill font-heading font-bold',
          'transition-[background-color,filter,transform] duration-100 active:scale-[0.98]',
          'disabled:opacity-50 disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
        <span>{children}</span>
        {trailingIcon ? <span aria-hidden="true">{trailingIcon}</span> : null}
      </button>
    );
  },
);
