'use client';

import Image from 'next/image';
import type { AdminOrderItem } from '@/lib/api';
import { formatEgp } from '@/lib/format';

interface ItemsTableProps {
  items: AdminOrderItem[];
}

/**
 * Clean line-item table for the admin order detail screen. Image + name +
 * options chips + qty + line total. Mobile-friendly: stacks at narrow widths.
 */
export function ItemsTable({ items }: ItemsTableProps) {
  if (!items?.length) {
    return <p className="text-sm italic text-cup-muted">No items.</p>;
  }
  return (
    <ul className="divide-y divide-cup-stroke" aria-label="Order items">
      {items.map((item, idx) => (
        <li key={`${item.productId}-${idx}`} className="flex gap-3 py-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-card bg-cup-cream-100">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.productNameEn}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-heading text-sm font-semibold text-cup-brown-900">
                {item.productNameEn}
              </p>
              <span className="text-xs text-cup-muted">×{item.quantity}</span>
            </div>
            {Object.keys(item.options || {}).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(item.options).map(([group, value]) => (
                  <span
                    key={`${group}-${value}`}
                    className="rounded-pill border border-cup-stroke bg-white px-2 py-0.5 text-[10px] uppercase tracking-wider text-cup-brown-700"
                  >
                    {group}: {value}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-cup-muted">
              {formatEgp(item.unitPriceEgp)} × {item.quantity} ={' '}
              <span className="font-semibold text-cup-brown-900">
                {formatEgp(item.lineTotalEgp)}
              </span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
