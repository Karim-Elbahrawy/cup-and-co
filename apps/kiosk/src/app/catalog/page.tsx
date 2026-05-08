'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { CatalogResponse, Product } from '@cup-and-co/types';
import { BigButton } from '@/components/BigButton';
import { ProductGrid } from '@/components/ProductGrid';
import { CartPill } from '@/components/CartPill';
import { CartDrawer } from '@/components/CartDrawer';
import { ToastHost, type ToastApi } from '@/components/Toast';
import { LanguageToggle } from '@/components/LanguageToggle';
import { StillThereModal } from '@/components/StillThereModal';
import { useIdleReset } from '@/lib/useIdleReset';
import { useCart } from '@/lib/cart';
import { useCartDrawer } from '@/lib/useCartDrawer';
import { useLang } from '@/lib/useLang';
import { useIdentified } from '@/lib/useIdentified';
import { api, ApiError } from '@/lib/api';

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
  const lang = useLang((s) => s.lang);
  const resetLang = useLang((s) => s.reset);
  const clearCart = useCart((s) => s.clear);
  const showDrawer = useCartDrawer((s) => s.show);
  const hideDrawer = useCartDrawer((s) => s.hide);
  const identified = useIdentified((s) => s.customer);
  const clearIdentified = useIdentified((s) => s.clear);
  const [showStillThere, setShowStillThere] = useState(false);

  function fullReset() {
    clearCart();
    hideDrawer();
    resetLang();
    clearIdentified();
    setShowStillThere(false);
    router.replace('/');
  }

  // Two-phase idle: warn at 75s, reset at 90s. The "still there?" modal
  // raises its own visible countdown — see StillThereModal.
  useIdleReset({
    onWarn: () => setShowStillThere(true),
    onIdle: fullReset,
    timeoutMs: 90_000,
    warnMs: 75_000,
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
    router.push(`/products/${encodeURIComponent(p.id)}`);
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

      <header className="mb-6 flex items-center justify-between gap-4">
        <BigButton
          variant="secondary"
          leadingIcon={<ChevronLeft className="h-7 w-7" />}
          onClick={fullReset}
          aria-label={lang === 'ar' ? 'العودة' : 'Back to start'}
        >
          {lang === 'ar' ? 'البداية' : 'Start over'}
        </BigButton>

        <div className="flex items-center gap-4">
          <LanguageToggle />
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--cup-muted)]">
              Cup &amp; Co
            </p>
            <h1 className="font-heading text-k-hero text-[var(--cup-espresso)]">
              {lang === 'ar' ? 'القائمة' : 'Today’s menu'}
            </h1>
          </div>
        </div>
      </header>

      {/* K4.5 — welcome banner for identified members */}
      {identified ? (
        <div className="mb-6 rounded-card bg-gradient-to-r from-cup-primary to-[#F4A261] px-8 py-5 text-white shadow-card">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/80">
            {lang === 'ar' ? 'أهلاً بيك تاني' : 'Welcome back'}
          </p>
          <p className="mt-1 font-heading text-k-card font-bold">
            {identified.name
              ? lang === 'ar' ? `يا ${identified.name} 👋` : `${identified.name} 👋`
              : '👋'}
            {identified.tier ? (
              <span className="ms-3 inline-flex items-center gap-1.5 rounded-pill bg-white/20 px-3 py-1 text-base">
                ✦ {identified.tier === 'gold' ? (lang === 'ar' ? 'ذهبي' : 'Gold') : identified.tier === 'silver' ? (lang === 'ar' ? 'فضي' : 'Silver') : (lang === 'ar' ? 'برونزي' : 'Bronze')}
              </span>
            ) : null}
            <span className="ms-3 text-base font-medium text-white/90">
              {identified.pointsBalance} {lang === 'ar' ? 'نقطة' : 'pts'}
            </span>
          </p>
        </div>
      ) : null}

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

      <CartPill onClick={showDrawer} />
      <CartDrawer lang={lang} />
      <StillThereModal
        open={showStillThere}
        onAck={() => setShowStillThere(false)}
        onTimeout={fullReset}
        onCancel={fullReset}
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
