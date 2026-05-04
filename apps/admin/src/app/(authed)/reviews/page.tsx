'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useSession } from '@/lib/useSession';
import { adminApi, type AdminReview } from '@/lib/api';

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
      <div className="grid min-h-[60vh] place-items-center text-cup-muted">
        Loading reviews…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cup-brown-900">Reviews</h1>
        <span className="rounded-pill bg-cup-cream-100 px-3 py-1 text-sm font-medium text-cup-brown-700">
          {reviews.length} total
        </span>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-card border border-cup-stroke bg-white p-12 text-center text-cup-muted">
          No reviews yet.
        </div>
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
