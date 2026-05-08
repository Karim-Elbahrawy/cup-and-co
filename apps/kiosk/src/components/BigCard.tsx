'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Kiosk big-touch card primitive.
 *
 * Used for product tiles in the catalog grid (K1.2), payment-method cards
 * on checkout (K1.7), and category chips. Minimum 160×160pt per K0.3 so two
 * fingers can rest on a card without accidentally hitting a neighbour.
 *
 * Out-of-stock state dims the card and disables interaction — wire this
 * for K1.4. We expose `interactive` rather than always using a button so
 * layout cards (e.g. confirmation summary in K1.8) can use the same
 * geometry without being clickable.
 */
interface BigCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders the card as a button instead of a div. */
  interactive?: boolean;
  /** Visually halves opacity and blocks pointer events. */
  disabled?: boolean;
  /** Adds a terracotta ring around the card (selected option chip / current category). */
  selected?: boolean;
  /** Slot rendered top-right — typically a price tag or an "Out today" pill. */
  badge?: ReactNode;
  /** Slot rendered bottom-left — typically an icon. */
  footnote?: ReactNode;
}

export const BigCard = forwardRef<HTMLDivElement, BigCardProps>(function BigCard(
  {
    interactive = false,
    disabled = false,
    selected = false,
    badge,
    footnote,
    className = '',
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const baseClasses = [
    'group relative flex flex-col gap-3 rounded-card bg-white p-5 shadow-card',
    'min-h-touch-card min-w-touch-card',
    'transition-[transform,box-shadow,border-color] duration-150',
    selected
      ? 'ring-4 ring-cup-primary border-transparent'
      : 'border border-[var(--cup-stroke)]',
    disabled ? 'opacity-50 pointer-events-none' : '',
    interactive ? 'active:scale-[0.99] hover:shadow-elevated cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Treating the card as a button when `interactive` is set keeps focus +
  // keyboard semantics free without forcing the consumer to remember
  // role="button" + tabIndex + Enter handling.
  if (interactive) {
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).click();
          }
        }}
        className={baseClasses}
        {...rest}
      >
        {badge ? <div className="absolute right-4 top-4">{badge}</div> : null}
        <div className="flex-1">{children}</div>
        {footnote ? (
          <div className="text-sm font-semibold text-[var(--cup-muted)]">{footnote}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={ref} className={baseClasses} onClick={onClick} {...rest}>
      {badge ? <div className="absolute right-4 top-4">{badge}</div> : null}
      <div className="flex-1">{children}</div>
      {footnote ? (
        <div className="text-sm font-semibold text-[var(--cup-muted)]">{footnote}</div>
      ) : null}
    </div>
  );
});
