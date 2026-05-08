'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star } from 'lucide-react';
import type { CatalogResponse, Product } from '@cup-and-co/types';
import { BigButton } from '@/components/BigButton';
import { ProductGrid } from '@/components/ProductGrid';
import { CartPill } from '@/components/CartPill';
import { CartDrawer } from '@/components/CartDrawer';
import { ToastHost, type ToastApi } from '@/components/Toast';
import { LanguageToggle } from '@/components/LanguageToggle';
import { StillThereModal } from '@/components/StillThereModal';
import {
  PersonalHero,
  buildCartOptionsFromUsual,
} from '@/components/PersonalHero';
import { useIdleReset } from '@/lib/useIdleReset';
import { useCart } from '@/lib/cart';
import { useCartDrawer } from '@/lib/useCartDrawer';
import { useLang } from '@/lib/useLang';
import { useIdentified } from '@/lib/useIdentified';
import { api, ApiError } from '@/lib/api';

type PersonalCard =
  | {
      kind: 'usual';
      productId: string;
      productNameEn: string;
      productNameAr: string;
      imageUrl: string;
      basePriceEgp: number;
      orderCount: number;
      preferredOptions: Record<string, string>;
    }
  | {
      kind: 'suggestion';
      productId: string;
      productNameEn: string;
      productNameAr: string;
      imageUrl: string;
      basePriceEgp: number;
      reason: 'history' | 'season' | 'bestseller';
    };

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
  const lines = useCart((s) => s.lines);
  const showDrawer = useCartDrawer((s) => s.show);
  const hideDrawer = useCartDrawer((s) => s.hide);
  const identified = useIdentified((s) => s.customer);
  const clearIdentified = useIdentified((s) => s.clear);
  const addLine = useCart((s) => s.addLine);
  const [showStillThere, setShowStillThere] = useState(false);
  const [personal, setPersonal] = useState<PersonalCard | null>(null);

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

  // K4.8 / K4.10 — fetch personal hero data when identified. Try /me/usual
  // first; if no clear "usual" yet, fall back to /me/suggestion. Soft-
  // failures: any error here just hides the personal card, doesn't
  // disrupt the catalog.
  useEffect(() => {
    if (!identified?.jwt) {
      setPersonal(null);
      return;
    }
    let cancelled = false;
    api
      .getMyUsual(identified.jwt)
      .then((res) => {
        if (cancelled) return;
        if (res.usual) {
          setPersonal({ kind: 'usual', ...res.usual });
          return;
        }
        return api.getMySuggestion(identified.jwt).then((sug) => {
          if (cancelled || !sug.suggestion) return;
          setPersonal({ kind: 'suggestion', ...sug.suggestion });
        });
      })
      .catch(() => {
        // Silent — the catalog remains usable without a personal card.
      });
    return () => {
      cancelled = true;
    };
  }, [identified?.jwt]);

  /**
   * K4.9 — derive combo suggestions from in-cart products. Union the
   * `pairs_well_with` arrays across all current cart lines, drop products
   * already in cart, drop unavailable / out-of-stock, take the first 2.
   */
  const comboSuggestions: Product[] = useMemo(() => {
    if (!catalog || lines.length === 0) return [];
    const inCart = new Set(lines.map((l) => l.product.id));
    const seen = new Set<string>();
    const suggestionIds: string[] = [];
    for (const line of lines) {
      const cartedProduct = catalog.products.find((p) => p.id === line.product.id);
      const pairIds = cartedProduct?.pairs_well_with ?? [];
      for (const id of pairIds) {
        if (inCart.has(id) || seen.has(id)) continue;
        seen.add(id);
        suggestionIds.push(id);
      }
    }
    const products: Product[] = [];
    for (const id of suggestionIds) {
      const p = catalog.products.find((c) => c.id === id);
      if (!p || !p.is_available || p.is_out_of_stock || p.stock_count === 0) continue;
      products.push(p);
      if (products.length >= 2) break;
    }
    return products;
  }, [catalog, lines]);

  /**
   * K4.9 — combo add. Fetches detail to resolve default options (zero-
   * price-delta per group), then drops the line. Falls back to
   * /products/:id if anything goes wrong, so the customer can complete
   * the customize flow manually instead of dropping a malformed line.
   */
  async function handleAddCombo(product: Product) {
    try {
      const detail = await api.getProductDetail(product.id);
      // Pick the zero-delta option per group as the "default" — that's
      // typically Medium / Normal sugar / Normal ice. If a group has no
      // zero-delta option, fall back to the first option.
      const defaults = new Map<string, (typeof detail.options)[number]>();
      for (const opt of detail.options) {
        if (defaults.has(opt.group_name)) continue;
        defaults.set(opt.group_name, opt);
      }
      // Override defaults with zero-delta picks where they exist.
      for (const opt of detail.options) {
        if (opt.price_delta_egp === 0) {
          defaults.set(opt.group_name, opt);
        }
      }
      const optionLines = Array.from(defaults.values()).map((o) => ({
        group: o.group_name,
        optionId: o.id,
        nameEn: o.name_en,
        nameAr: o.name_ar,
        priceDeltaEgp: o.price_delta_egp,
      }));
      addLine({
        product: {
          id: detail.product.id,
          name_en: detail.product.name_en,
          name_ar: detail.product.name_ar,
          image_url: detail.product.image_url,
          base_price_egp: detail.product.base_price_egp,
          prep_minutes: detail.product.prep_minutes,
        },
        quantity: 1,
        options: optionLines,
      });
      toastRef.current?.show(
        lang === 'ar'
          ? `تمت إضافة ${product.name_ar} للطلب`
          : `Added ${product.name_en} to your order`,
      );
    } catch {
      router.push(`/products/${encodeURIComponent(product.id)}`);
    }
  }

  /**
   * K4.10 one-tap reorder. Refetches the product detail to resolve the
   * customer's preferred option NAMES into real ProductOption records
   * (the cart line needs id + price_delta), then drops the line.
   */
  async function handleReorderUsual(usual: Extract<PersonalCard, { kind: 'usual' }>) {
    try {
      const detail = await api.getProductDetail(usual.productId);
      const opts = buildCartOptionsFromUsual(usual.preferredOptions, detail.options);
      if (!opts) {
        // Catalog moved underneath us — ask the customer to customize.
        router.push(`/products/${encodeURIComponent(usual.productId)}`);
        return;
      }
      addLine({
        product: {
          id: detail.product.id,
          name_en: detail.product.name_en,
          name_ar: detail.product.name_ar,
          image_url: detail.product.image_url,
          base_price_egp: detail.product.base_price_egp,
          prep_minutes: detail.product.prep_minutes,
        },
        quantity: 1,
        options: opts,
      });
      toastRef.current?.show(
        lang === 'ar'
          ? `تمت إضافة ${usual.productNameAr} للطلب`
          : `Added your usual to the order`,
      );
    } catch {
      // Fallback to detail screen on any failure.
      router.push(`/products/${encodeURIComponent(usual.productId)}`);
    }
  }

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

      <header className="mb-8 flex items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <BigButton
            variant="secondary"
            leadingIcon={<ChevronLeft className="h-7 w-7" />}
            onClick={fullReset}
            aria-label={lang === 'ar' ? 'العودة للبداية' : 'Back to start'}
          >
            {lang === 'ar' ? 'البداية' : 'Start over'}
          </BigButton>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-end">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--cup-muted)]">
              {lang === 'ar' ? 'كاب آند كو' : 'Cup & Co'}
            </p>
            <h1 className="mt-0.5 font-heading text-[44px] font-extrabold leading-none tracking-tight text-[var(--cup-espresso)]">
              {lang === 'ar' ? 'القائمة' : "Today's menu"}
            </h1>
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* Welcome banner for identified members.
          Refined: tighter padding, single-line layout that doesn't wrap,
          no emoji ("👋" was the loudest non-brand element on the screen).
          The teal tier badge picks up the brand-mandatory accent so the
          banner doesn't read as pure terracotta. */}
      {identified ? (
        <div className="mb-6 flex items-center gap-5 rounded-card cup-sunrise px-7 py-4 text-white shadow-card">
          <span
            className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-white/20 font-heading text-[20px] font-extrabold"
            aria-hidden="true"
          >
            {(identified.name?.[0] ?? '?').toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/80">
              {lang === 'ar' ? 'أهلاً بيك تاني' : 'Welcome back'}
            </p>
            <p className="mt-0.5 truncate font-heading text-[26px] font-bold">
              {identified.name ?? (lang === 'ar' ? 'عميلنا' : 'Friend')}
            </p>
          </div>
          {identified.tier ? (
            <span
              className="inline-flex items-center gap-2 rounded-pill bg-white/20 px-4 py-2 text-base font-bold"
              style={{ backdropFilter: 'saturate(140%)' }}
            >
              <Star className="h-4 w-4 fill-white text-white" aria-hidden="true" />
              {identified.tier === 'gold'
                ? lang === 'ar' ? 'ذهبي' : 'Gold'
                : identified.tier === 'silver'
                  ? lang === 'ar' ? 'فضي' : 'Silver'
                  : lang === 'ar' ? 'برونزي' : 'Bronze'}
            </span>
          ) : null}
          <span className="font-heading text-[26px] font-extrabold tabular-nums">
            {identified.pointsBalance}
            <span className="ms-1 text-sm font-bold tracking-wider text-white/85">
              {lang === 'ar' ? 'نقطة' : 'pts'}
            </span>
          </span>
        </div>
      ) : null}

      {/* K4.8 / K4.10 — personal hero (identified-only). Stacks UNDER
          the FeaturedHero (which lives inside ProductGrid) but ABOVE
          the regular product tiles, so the row reads:
          [global featured] → [your usual / try this] → grid. */}
      {identified && personal ? (
        <div className="mb-5">
          {personal.kind === 'usual' ? (
            <PersonalHero
              variant="usual"
              lang={lang}
              imageUrl={personal.imageUrl}
              productNameEn={personal.productNameEn}
              productNameAr={personal.productNameAr}
              basePriceEgp={personal.basePriceEgp}
              orderCount={personal.orderCount}
              onReorder={() => handleReorderUsual(personal)}
            />
          ) : (
            <PersonalHero
              variant="suggestion"
              lang={lang}
              imageUrl={personal.imageUrl}
              productNameEn={personal.productNameEn}
              productNameAr={personal.productNameAr}
              basePriceEgp={personal.basePriceEgp}
              reason={personal.reason}
              onTap={() =>
                router.push(`/products/${encodeURIComponent(personal.productId)}`)
              }
            />
          )}
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
      <CartDrawer
        lang={lang}
        comboSuggestions={comboSuggestions}
        onAddCombo={handleAddCombo}
      />
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
