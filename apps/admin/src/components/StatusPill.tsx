import type { OrderStatus } from '@cup-and-co/types';

interface StatusPillProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

const LABELS: Record<OrderStatus, string> = {
  received: 'Received',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'On the way',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/** Tailwind classes per status. We reuse the cup-* palette and avoid raw greys. */
const STYLES: Record<OrderStatus, string> = {
  received: 'bg-cup-orange-100 text-cup-orange-700 ring-cup-orange-200',
  accepted: 'bg-cup-cream-200 text-cup-brown-700 ring-cup-cream-300',
  preparing: 'bg-cup-orange-200 text-cup-orange-700 ring-cup-orange-300',
  ready: 'bg-cup-teal-100 text-cup-teal-700 ring-cup-teal-200',
  out_for_delivery: 'bg-cup-teal-100 text-cup-teal-700 ring-cup-teal-200',
  completed: 'bg-cup-brown-100 text-cup-brown-700 ring-cup-brown-200',
  cancelled: 'bg-rose-50 text-cup-error ring-rose-100',
  refunded: 'bg-rose-50 text-cup-error ring-rose-100',
};

export function StatusPill({ status, size = 'md' }: StatusPillProps) {
  const label = LABELS[status];
  const tone = STYLES[status];
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-pill font-semibold uppercase tracking-wider ring-1 ring-inset ${tone} ${sizing}`}
    >
      {label}
    </span>
  );
}

export const ORDER_STATUS_LABEL = LABELS;
