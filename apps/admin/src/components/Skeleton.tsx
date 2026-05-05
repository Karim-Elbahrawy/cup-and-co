/**
 * Generic pulsing-block placeholder. Use to ghost the shape of real content
 * while it loads instead of bare "Loading…" text.
 *
 * The animate-pulse keyframe lives in Tailwind base — no extra CSS needed.
 */
export function Skeleton({
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-chip bg-cup-stroke/70 ${className}`}
      {...rest}
    />
  );
}

export function SkeletonText({ width = 'w-1/2' }: { width?: string }) {
  return <Skeleton className={`h-3 ${width}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-3/4" />
    </div>
  );
}

export function SkeletonRow({ cols = 3 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 rounded-chip border border-cup-stroke bg-cup-surface p-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? 'flex-1' : 'w-16'}`} />
      ))}
    </div>
  );
}
