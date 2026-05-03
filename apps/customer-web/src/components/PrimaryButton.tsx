'use client';

import { forwardRef } from 'react';
import { LoadingDots } from './LoadingDots';

type Variant = 'primary' | 'secondary' | 'ghost';

interface PrimaryButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  loading?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[var(--cup-primary)] text-white shadow-[0_8px_24px_rgba(194,65,12,0.18)] hover:bg-[var(--cup-primary-hover)] disabled:bg-[var(--cup-primary)]/50',
  secondary:
    'bg-[var(--cup-accent)] text-white shadow-[0_8px_24px_rgba(15,118,110,0.18)] hover:bg-[var(--cup-accent-hover)] disabled:bg-[var(--cup-accent)]/50',
  ghost:
    'bg-white text-[var(--cup-cocoa)] border border-[var(--cup-stroke)] hover:border-[var(--cup-primary)] hover:text-[var(--cup-primary)]',
};

/**
 * Pill-shaped primary CTA used across auth + checkout. Loading state shows
 * the bouncing dots instead of the label and disables interaction.
 */
export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(function PrimaryButton(
  { loading = false, variant = 'primary', fullWidth = true, children, className = '', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={[
        'relative inline-flex h-12 items-center justify-center gap-2 rounded-pill px-6 font-semibold transition-all duration-150',
        'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cup-primary)]',
        'disabled:cursor-not-allowed disabled:opacity-70',
        fullWidth ? 'w-full' : '',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <LoadingDots /> : children}
    </button>
  );
});
