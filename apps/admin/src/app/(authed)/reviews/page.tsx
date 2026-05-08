'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useSession } from '@/lib/useSession';
import { adminApi, type AdminReview } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

export default function ReviewsPage() {
  const toast = useToast();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.role !== 'owner') router.replace('/');
  }, [session, router]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listReviews()
      .then((res) => {
        if (!cancelled) setReviews(res.reviews);
      })
      .catch((err) => toast('error', err.message))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [toast]);

  async function toggleHidden(id: string, current: boolean) {
    try {
      await adminApi.setReviewVisibility(id, !current);
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, hidden: !current } : r)),
      );
      toast('success', current ? 'Review is now visible' : 'Review hidden');
    } catch (err: unknown) {
      toast('error', (err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const visibleCount = reviews.filter((r) => !r.hidden).length;
  const hiddenCount = reviews.length - visibleCount;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '—';

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Moderation</p>
        <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Reviews</h1>
        <p className="mt-1 text-sm text-cup-muted">
          Hide or restore customer reviews. Hidden reviews still exist — customers do not see them.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total reviews" value={reviews.length} />
        <Stat label="Visible" value={visibleCount} tone="teal" />
        <Stat label="Average rating" value={avgRating} tone="orange" />
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet."
          description="Reviews appear here once customers leave feedback on completed orders."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`rounded-card border bg-white p-4 shadow-sm transition ${
                review.hidden ? 'border-cup-stroke opacity-60' : 'border-cup-stroke'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'fill-cup-star text-cup-star'
                              : 'text-cup-stroke'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-cup-muted">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                    {review.hidden && (
                      <span className="rounded-pill bg-cup-brown-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-cup-muted">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-cup-brown-900">
                    {review.userName ?? review.userId.slice(0, 8)}
                  </p>
                  <p className="text-sm text-cup-brown-700">{review.comment}</p>
                  <p className="text-xs text-cup-muted">Product: {review.productId.slice(0, 8)}…</p>
                </div>
                <button
                  onClick={() => toggleHidden(review.id, review.hidden)}
                  className="flex shrink-0 items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1.5 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
                >
                  {review.hidden ? (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: 'teal' | 'orange';
}) {
  const accent =
    tone === 'teal' ? 'text-cup-teal-700' : tone === 'orange' ? 'text-cup-orange-700' : 'text-cup-brown-900';
  return (
    <div className="rounded-card border border-cup-stroke bg-cup-surface px-4 py-3 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-muted">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
