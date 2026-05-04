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
