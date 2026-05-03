import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Optional accent stripe at the left edge. */
  accent?: 'orange' | 'teal' | 'none';
  children?: ReactNode;
}

/**
 * Compact stat card used on the Today Overview. Designed to sit in a 3-up grid
 * on desktop and stack on tablets at 768px+.
 */
export function StatCard({ label, value, hint, accent = 'none', children }: StatCardProps) {
  const accentBar =
    accent === 'orange'
      ? 'before:bg-cup-orange-600'
      : accent === 'teal'
        ? 'before:bg-cup-teal-700'
        : 'before:bg-transparent';

  return (
    <section
      className={`relative overflow-hidden rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${accentBar}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-muted">
        {label}
      </p>
      <div className="mt-2 font-heading text-3xl font-bold text-cup-brown-900">{value}</div>
      {hint && <div className="mt-2 text-sm text-cup-brown-700">{hint}</div>}
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}
