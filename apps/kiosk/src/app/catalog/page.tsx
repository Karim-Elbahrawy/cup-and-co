'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { CatalogResponse, Product } from '@cup-and-co/types';
import { BigButton } from '@/components/BigButton';
import { ProductGrid } from '@/components/ProductGrid';
import { CartPill } from '@/components/CartPill';
import { ToastHost, type ToastApi } from '@/components/Toast';
import { useIdleReset } from '@/lib/useIdleReset';
import { useCart } from '@/lib/cart';
import { api, ApiError } from '@/lib/api';
import type { KioskLang } from '@/lib/lang';

/**
 * /catalog — the customer's first interactive screen after the attract
 * loop. Loads the catalog from the API, renders the category-tabbed grid,
 * and arms idle reset.
 *
 * Wired for K1.2:
 *   - GET /catalog (with offline-friendly error UI)
 *   - Tap product → /products/:id (K1.3 detail screen, not yet built — for
 *     K1.2 the route is a TODO and we toast 'Customizing soon')
 *   - Tap out-of-stock → toast, no nav
 *   - Cart pill bottom-right shows item count + total (always 0 in K1.2 —
 *     real lines come from K1.3)
 *
 * Lang is hardcoded to EN for K1.2; the toggle ships in K1.6 with a
 * session store. Keeping the prop threading in place now means K1.6 is a
 * one-line change here.
 */
export default function CatalogPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const toastRef = useRef<ToastApi | null>(null);
  // Hardcoded EN until K1.6 ships the language store. Cast prevents TS from
  // narrowing the literal — the K1.6 store will return a real KioskLang.
  const lang = 'en' as KioskLang;
  const clearCart = useCart((s) => s.clear);

  // Idle reset returns to attract AND clears the cart, matching the K1.9
  // contract one phase early — easier to keep than to re-introduce later
  // when state has accreted.
  useIdleReset({
    onIdle: () => {
      clearCart();
      router.replace('/');
    },
    timeoutMs: 90_000,
  });

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setCatalog(null);
    api
      .getCatalog()
      .then((c) => {
        if (!cancelled) setCatalog(c);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError
            ? e.message
            : 'Could not reach the menu. Check the network.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  function bindToast(api: ToastApi) {
    toastRef.current = api;
  }

  function handleSelectProduct(p: Product) {
    // Detail screen lands in K1.3. Until then keep the customer in /catalog
    // with a clear "we hear you" toast so the tap doesn't feel dead.
    toastRef.current?.show(
      lang === 'ar' ? `قريباً: ${p.name_ar}` : `Customizing soon: ${p.name_en}`,
    );
  }

  function handleOutOfStockTap(p: Product) {
    toastRef.current?.show(
      lang === 'ar'
        ? `نفد اليوم — ${p.name_ar}`
        : `Out of stock today — ${p.name_en}`,
    );
  }

  return (
    <main className="relative h-dvh w-dvw overflow-y-auto bg-[var(--cup-paper)] px-12 pb-24 pt-8">
      <ToastHost bind={bindToast} />

      <header className="mb-6 flex items-center justify-between">
        <BigButton
          variant="secondary"
          leadingIcon={<ChevronLeft className="h-7 w-7" />}
          onClick={() => {
            clearCart();
            router.replace('/');
          }}
          aria-label={lang === 'ar' ? 'العودة' : 'Back to start'}
        >
          {lang === 'ar' ? 'البداية' : 'Start over'}
        </BigButton>

        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--cup-muted)]">
            Cup &amp; Co
          </p>
          <h1 className="font-heading text-k-hero text-[var(--cup-espresso)]">
            {lang === 'ar' ? 'القائمة' : 'Today’s menu'}
          </h1>
        </div>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={() => setRetryNonce((n) => n + 1)} />
      ) : catalog === null ? (
        <LoadingSkeleton />
      ) : (
        <ProductGrid
          catalog={catalog}
          lang={lang}
          onSelectProduct={handleSelectProduct}
          onOutOfStockTap={handleOutOfStockTap}
        />
      )}

      <CartPill
        onClick={() =>
          toastRef.current?.show(
            lang === 'ar' ? 'العربة قريباً' : 'Cart drawer coming soon',
          )
        }
      />
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-[360px] animate-pulse rounded-card border border-[var(--cup-stroke)] bg-white p-5"
          aria-hidden="true"
        >
          <div className="aspect-square rounded-2xl bg-[var(--cup-paper)]" />
          <div className="mt-4 h-6 w-3/4 rounded-full bg-[var(--cup-paper)]" />
          <div className="mt-3 h-5 w-1/3 rounded-full bg-[var(--cup-paper)]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto mt-20 max-w-xl rounded-card bg-white p-10 text-center shadow-card"
    >
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--cup-error)]">
        We hit a snag
      </p>
      <p className="font-heading text-k-card text-[var(--cup-espresso)]">
        {message}
      </p>
      <div className="mt-8">
        <BigButton onClick={onRetry}>Try again</BigButton>
      </div>
    </div>
  );
}
