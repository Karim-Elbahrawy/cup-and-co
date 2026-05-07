'use client';

import { motion } from 'framer-motion';

export function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-cup-stroke bg-white p-3 shadow-subtle">
      <div className="mx-auto h-24 w-24 rounded-full bg-cup-stroke" />
      <div className="mx-auto h-4 w-20 rounded bg-cup-stroke" />
      <div className="mx-auto h-3 w-14 rounded bg-cup-stroke" />
      <div className="mx-auto h-8 w-24 rounded-full bg-cup-stroke" />
    </div>
  );
}

export function SkeletonProductGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="h-3 animate-pulse rounded bg-cup-stroke"
      style={{ width }}
    />
  );
}

export function SkeletonBlock() {
  return (
    <div className="space-y-2">
      <SkeletonLine width="60%" />
      <SkeletonLine width="40%" />
    </div>
  );
}

export function SkeletonOrderCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-cup-stroke bg-white p-4 shadow-subtle">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 rounded bg-cup-stroke" />
          <div className="h-3 w-36 rounded bg-cup-stroke" />
        </div>
        <div className="h-6 w-16 rounded-full bg-cup-stroke" />
      </div>
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-8 rounded-lg bg-cup-stroke" />
        ))}
      </div>
      <div className="mt-3 flex justify-between">
        <div className="h-3 w-20 rounded bg-cup-stroke" />
        <div className="h-3 w-16 rounded bg-cup-stroke" />
      </div>
    </div>
  );
}

export function SkeletonOrderList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonOrderCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-card border border-cup-stroke bg-white p-5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-cup-stroke" />
            <div className="h-3 w-20 rounded bg-cup-stroke" />
          </div>
          <div className="mt-3 h-7 w-28 rounded bg-cup-stroke" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-cup-stroke">
      <div className="h-10 bg-cup-cream-100" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-t border-cup-stroke px-4 py-3">
          <div className="h-4 flex-1 rounded bg-cup-stroke" />
          <div className="h-4 w-16 rounded bg-cup-stroke" />
          <div className="h-4 w-20 rounded bg-cup-stroke" />
        </div>
      ))}
    </div>
  );
}
