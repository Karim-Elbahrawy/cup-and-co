'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { OrderStatus } from '@cup-and-co/types';
import type { AdminOrder } from '@/lib/api';
import { ItemsTable } from './ItemsTable';
import { StatusPill } from './StatusPill';
import { nextStatus, previousStatus } from './OrderCard';
import { formatEgp, timeAgo, formatTime } from '@/lib/format';

// ─── deterministic avatar colour ────────────────────────────────────────────

const PALETTES = [
  { bg: 'bg-cup-orange-100', text: 'text-cup-orange-700' },
  { bg: 'bg-cup-teal-100',   text: 'text-cup-teal-700'   },
  { bg: 'bg-indigo-100',     text: 'text-indigo-700'     },
  { bg: 'bg-cup-cream-200',  text: 'text-cup-brown-700'  },
  { bg: 'bg-rose-100',       text: 'text-rose-700'       },
  { bg: 'bg-purple-100',     text: 'text-purple-700'     },
  { bg: 'bg-amber-100',      text: 'text-amber-700'      },
  { bg: 'bg-sky-100',        text: 'text-sky-700'        },
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function labelForAdvance(target: OrderStatus): string {
  const MAP: Partial<Record<OrderStatus, string>> = {
    accepted: 'Accept',
    preparing: 'Prep',
    ready: 'Ready',
    completed: 'Complete',
  };
  return MAP[target] ?? 'Advance';
}

// ─── component ──────────────────────────────────────────────────────────────

interface OrderDetailDrawerProps {
  order: AdminOrder | null;
  onClose: () => void;
  onAdvance: (orderId: string, next: OrderStatus) => void;
  onBack: (orderId: string, prev: OrderStatus) => void;
}

export function OrderDetailDrawer({
  order,
  onClose,
  onAdvance,
  onBack,
}: OrderDetailDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isOpen = order !== null;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Move focus into panel when it opens
  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const palette = PALETTES[hashId(order?.userId ?? '') % PALETTES.length];
  const next = order ? nextStatus(order.status) : null;
  const prev = order ? previousStatus(order.status) : null;
  const initial = (order?.userId ?? '?').slice(0, 1).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-cup-espresso/25 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
        tabIndex={-1}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-cup-surface outline-none shadow-elevated transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {order ? (
          <>
            {/* ── Header ── */}
            <div className="flex shrink-0 items-center justify-between border-b border-cup-stroke px-5 py-4">
              <span className="font-heading text-base font-semibold text-cup-brown-900">
                Order details
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-cup-muted transition hover:bg-cup-paper hover:text-cup-brown-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">

              {/* Customer avatar row */}
              <div className="flex items-center gap-3 border-b border-cup-stroke px-5 py-4">
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${palette.bg}`}
                  aria-hidden
                >
                  <span className={`font-heading text-lg font-bold ${palette.text}`}>
                    {initial}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
                    Customer
                  </p>
                  <p className="font-heading text-sm font-semibold text-cup-brown-900 truncate">
                    #{order.userId.slice(0, 8)}
                  </p>
                </div>
                <div className="ml-auto shrink-0 text-right">
                  <StatusPill status={order.status} size="sm" />
                  <p className="mt-1 text-[11px] text-cup-muted">{timeAgo(order.createdAt)}</p>
                </div>
              </div>

              {/* Pickup code + total */}
              <div className="flex items-center justify-between border-b border-cup-stroke px-5 py-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
                    Pickup code
                  </p>
                  <p className="mt-0.5 font-heading text-[52px] font-bold leading-none tracking-tight text-cup-orange-600">
                    {order.pickupCode ?? '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
                    Total
                  </p>
                  <p className="mt-0.5 font-heading text-2xl font-bold text-cup-brown-900">
                    {formatEgp(order.totalEgp)}
                  </p>
                  <p className="mt-0.5 text-[11px] capitalize text-cup-muted">
                    {order.paymentMethod.replace(/_/g, ' ')} · {order.fulfillmentType}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="border-b border-cup-stroke px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
                  Items
                </p>
                <ItemsTable items={order.items} />
              </div>

              {/* Summary */}
              <div className="border-b border-cup-stroke px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
                  Summary
                </p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-cup-muted">Subtotal</dt>
                    <dd>{formatEgp(order.subtotalEgp)}</dd>
                  </div>
                  {order.discountEgp > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-cup-muted">Discount</dt>
                      <dd className="text-cup-success">−{formatEgp(order.discountEgp)}</dd>
                    </div>
                  )}
                  {order.pointsRedeemed > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-cup-muted">Points used</dt>
                      <dd>{order.pointsRedeemed} pts</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-cup-stroke pt-2">
                    <dt className="font-semibold text-cup-brown-900">Total</dt>
                    <dd className="font-heading font-bold text-cup-brown-900">
                      {formatEgp(order.totalEgp)}
                    </dd>
                  </div>
                  {order.scheduledFor && (
                    <div className="flex justify-between pt-1">
                      <dt className="text-cup-muted">Scheduled</dt>
                      <dd>{formatTime(order.scheduledFor)}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="border-b border-cup-stroke px-5 py-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
                    Notes
                  </p>
                  <p className="text-sm italic leading-relaxed text-cup-brown-700">
                    {order.notes}
                  </p>
                </div>
              )}

              {/* bottom breathing room */}
              <div className="h-4" />
            </div>

            {/* ── Sticky action footer ── */}
            {(next || prev) && (
              <div className="flex shrink-0 gap-2 border-t border-cup-stroke bg-cup-surface p-4">
                {prev && (
                  <button
                    type="button"
                    onClick={() => onBack(order.id, prev)}
                    className="flex-1 rounded-pill border border-cup-stroke bg-white py-2.5 text-sm font-semibold text-cup-brown-700 transition hover:bg-cup-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
                  >
                    ← Back
                  </button>
                )}
                {next && (
                  <button
                    type="button"
                    onClick={() => onAdvance(order.id, next)}
                    className="flex-1 rounded-pill bg-cup-orange-600 py-2.5 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cup-orange-600"
                  >
                    {labelForAdvance(next)} →
                  </button>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
