import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

/**
 * Standard empty-state block — icon, title, description, optional CTA.
 * Used on every list screen when there's nothing to show.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-cup-stroke bg-cup-surface/60 px-6 py-12 text-center">
      {Icon && (
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-cup-cream-100 text-cup-orange-600">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
      )}
      <p className="font-heading text-base font-semibold text-cup-brown-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-cup-muted">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 rounded-pill bg-cup-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
