'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import type {
  ProductDetailResponse,
  ProductOption,
  OptionGroup,
} from '@cup-and-co/types';
import { BigButton } from '@/components/BigButton';
import { OptionGroupRow } from '@/components/OptionGroupRow';
import { QuantityStepper } from '@/components/QuantityStepper';
import { ToastHost, type ToastApi } from '@/components/Toast';
import { LanguageToggle } from '@/components/LanguageToggle';
import { StillThereModal } from '@/components/StillThereModal';
import { useIdleReset } from '@/lib/useIdleReset';
import { api, ApiError } from '@/lib/api';
import { useCart, type CartLineOption } from '@/lib/cart';
import { useLang } from '@/lib/useLang';
import { useIdentified } from '@/lib/useIdentified';
import { DrinkBuilder } from '@/components/DrinkBuilder';

/**
 * /products/[id] — "CUSTOMIZE YOUR DRINK" detail screen (K1.3).
 *
 * Layout matches the user's reference image:
 *   - Hero illustration on the left (large, centred)
 *   - Stack of option chip groups on the right
 *   - Quantity stepper bottom-left
 *   - Big "ADD TO ORDER" pill bottom-centre, showing the live total
 *
 * Default selection rule per group: the option with `price_delta_egp === 0`
 * (typically the "Medium" / "Regular" / "No syrup" baseline). If no zero
 * exists for a group, fall back to the first option. Prevents the customer
 * from being able to add to cart without making a choice on every group.
 */

// Stable display order for option groups — drives the UI even though the
// underlying array order from the API is by sort within group.
const GROUP_ORDER: OptionGroup[] = ['size', 'shots', 'milk', 'sugar', 'ice', 'extras'];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  // Next 15 server props pattern — `params` is a Promise that we unwrap with
  // React's `use()` so the component itself stays a client component.
  const { id } = use(params);

  const router = useRouter();
  const [detail, setDetail] = useState<ProductDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [selections, setSelections] = useState<Record<OptionGroup, string | null>>(
    emptySelections(),
  );
  const [quantity, setQuantity] = useState(1);
  const toastRef = useRef<ToastApi | null>(null);
  const lang = useLang((s) => s.lang);
  const addLine = useCart((s) => s.addLine);
  const [showStillThere, setShowStillThere] = useState(false);

  function fullReset() {
    useCart.getState().clear();
    useLang.getState().reset();
    // K4 — clear identity on idle so the next customer can't see the
    // previous one's name/tier.
    useIdentified.getState().clear();
    setShowStillThere(false);
    router.replace('/');
  }

  useIdleReset({
    onWarn: () => setShowStillThere(true),
    onIdle: fullReset,
    timeoutMs: 90_000,
    warnMs: 75_000,
  });

  // Fetch detail. Re-runs when `retryNonce` flips (manual retry button).
  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    api
      .getProductDetail(id)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setSelections(defaultsFromOptions(d.options));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError
            ? e.message
            : 'Could not load this drink. Try again.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, retryNonce]);

  // Group options by `group_name` keeping the original sort.
  const groupedOptions = useMemo(() => {
    const map = new Map<OptionGroup, ProductOption[]>();
    if (!detail) return map;
    for (const opt of detail.options) {
      const arr = map.get(opt.group_name) ?? [];
      arr.push(opt);
      map.set(opt.group_name, arr);
    }
    return map;
  }, [detail]);

  // Live total = (base + sum of selected option deltas) × quantity. Recomputes
  // on every selection change, which is exactly what the spec asks for.
  const liveTotal = useMemo(() => {
    if (!detail) return 0;
    const base = detail.product.base_price_egp;
    let delta = 0;
    for (const optId of Object.values(selections)) {
      if (!optId) continue;
      const opt = detail.options.find((o) => o.id === optId);
      if (opt) delta += opt.price_delta_egp;
    }
    return (base + delta) * quantity;
  }, [detail, selections, quantity]);

  function bindToast(api: ToastApi) {
    toastRef.current = api;
  }

  function handleSelect(group: OptionGroup, optionId: string) {
    setSelections((prev) => ({ ...prev, [group]: optionId }));
  }

  function handleAddToOrder() {
    if (!detail) return;
    const chosen: CartLineOption[] = Object.entries(selections)
      .filter(([, id]) => id !== null)
      .map(([group, id]) => {
        const opt = detail.options.find((o) => o.id === id)!;
        return {
          group: group as OptionGroup,
          optionId: opt.id,
          nameEn: opt.name_en,
          nameAr: opt.name_ar,
          priceDeltaEgp: opt.price_delta_egp,
        };
      });

    addLine({
      product: {
        id: detail.product.id,
        name_en: detail.product.name_en,
        name_ar: detail.product.name_ar,
        image_url: detail.product.image_url,
        base_price_egp: detail.product.base_price_egp,
        prep_minutes: detail.product.prep_minutes,
      },
      quantity,
      options: chosen,
    });

    toastRef.current?.show(
      lang === 'ar'
        ? `تمت إضافة ${detail.product.name_ar} للطلب`
        : `Added ${detail.product.name_en} to your order`,
    );
    // Slight delay so the customer sees the toast, then bounce back to the
    // catalog so they can keep building the order.
    window.setTimeout(() => router.replace('/catalog'), 700);
  }

  return (
    <main className="relative h-dvh w-dvw overflow-y-auto bg-[var(--cup-paper)]">
      <ToastHost bind={bindToast} />

      {/* Top-right language toggle — sits above the hero on every screen. */}
      <div className="absolute right-8 top-8 z-20">
        <LanguageToggle />
      </div>

      {/* Sticky back chrome — translucent so the hero shows through. */}
      <div className="absolute left-8 top-8 z-20">
        <BigButton
          variant="secondary"
          leadingIcon={<ChevronLeft className="h-7 w-7" />}
          onClick={() => router.replace('/catalog')}
          aria-label={lang === 'ar' ? 'العودة للقائمة' : 'Back to menu'}
        >
          {lang === 'ar' ? 'القائمة' : 'Menu'}
        </BigButton>
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => setRetryNonce((n) => n + 1)}
          onBack={() => router.replace('/catalog')}
        />
      ) : detail === null ? (
        <DetailSkeleton />
      ) : (
        <div className="grid h-full min-h-dvh grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* ── Hero column ─────────────────────────────────────────── */}
          <section className="relative grid place-items-center px-12 pb-40 pt-28 lg:pb-12">
            <div
              aria-hidden="true"
              className="absolute inset-12 rounded-[64px] cup-sunrise opacity-10 blur-3xl"
            />
            <div className="relative aspect-square w-full max-w-[560px] drop-shadow-[0_30px_60px_rgba(28,25,23,0.18)]">
              {/* K2.1 — live drink-builder visual. Picks a layered SVG
                  per drink class and animates layers as options change.
                  Falls back to the static product image for desserts /
                  breakfast / anything we don't have art for. */}
              <DrinkBuilder
                product={detail.product}
                selectionsByGroup={Object.fromEntries(
                  Object.entries(selections).map(([group, optionId]) => [
                    group,
                    detail.options.find((o) => o.id === optionId),
                  ]),
                )}
                categories={[]}
              />
            </div>
          </section>

          {/* ── Customize column ───────────────────────────────────── */}
          <section className="px-12 pb-48 pt-28 lg:overflow-y-auto lg:pt-12">
            <p className="text-sm font-bold uppercase tracking-[0.4em] text-[var(--cup-primary)]">
              {lang === 'ar' ? 'خصص مشروبك' : 'Customize your drink'}
            </p>
            <h1 className="mt-2 font-heading text-k-hero leading-tight text-[var(--cup-espresso)]">
              {lang === 'ar' ? detail.product.name_ar : detail.product.name_en}
            </h1>
            <p className="mt-4 max-w-xl font-body text-k-body text-[var(--cup-cocoa)]">
              {lang === 'ar'
                ? detail.product.description_ar
                : detail.product.description_en}
            </p>

            <div className="mt-10">
              {GROUP_ORDER.map((group) => {
                const opts = groupedOptions.get(group);
                if (!opts || opts.length === 0) return null;
                return (
                  <OptionGroupRow
                    key={group}
                    group={group}
                    options={opts}
                    selectedOptionId={selections[group]}
                    lang={lang}
                    onSelect={(id) => handleSelect(group, id)}
                  />
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ── Sticky action bar ───────────────────────────────────────── */}
      {detail ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--cup-stroke)] bg-white/90 px-12 py-5 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6">
            <QuantityStepper value={quantity} onChange={setQuantity} size="lg" />

            <BigButton
              size="xl"
              onClick={handleAddToOrder}
              trailingIcon={<ArrowRight className="h-7 w-7" />}
            >
              <span>{lang === 'ar' ? 'أضف للطلب' : 'ADD TO ORDER'}</span>
              <span
                className="ms-3 rounded-full bg-white/15 px-5 py-1 text-[26px]"
                aria-label={`Total ${liveTotal} EGP`}
              >
                {liveTotal} EGP
              </span>
            </BigButton>
          </div>
        </div>
      ) : null}

      <StillThereModal
        open={showStillThere}
        onAck={() => setShowStillThere(false)}
        onTimeout={fullReset}
        onCancel={fullReset}
      />
    </main>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

function emptySelections(): Record<OptionGroup, string | null> {
  return {
    size: null,
    shots: null,
    sugar: null,
    ice: null,
    milk: null,
    extras: null,
  };
}

/**
 * Pick a sensible default option per group: the zero-delta option if one
 * exists, otherwise the first option. This means the customer can hit
 * ADD TO ORDER immediately without dropping into every group.
 */
function defaultsFromOptions(
  options: ProductOption[],
): Record<OptionGroup, string | null> {
  const out = emptySelections();
  const byGroup = new Map<OptionGroup, ProductOption[]>();
  for (const opt of options) {
    const arr = byGroup.get(opt.group_name) ?? [];
    arr.push(opt);
    byGroup.set(opt.group_name, arr);
  }
  for (const [group, opts] of byGroup) {
    const zero = opts.find((o) => o.price_delta_egp === 0);
    out[group] = (zero ?? opts[0]).id;
  }
  return out;
}

function DetailSkeleton() {
  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-2">
      <div className="grid place-items-center p-16">
        <div className="aspect-square w-full max-w-[480px] animate-pulse rounded-[64px] bg-[var(--cup-stroke)]" />
      </div>
      <div className="space-y-6 p-16">
        <div className="h-6 w-40 animate-pulse rounded-full bg-[var(--cup-stroke)]" />
        <div className="h-14 w-3/4 animate-pulse rounded-full bg-[var(--cup-stroke)]" />
        <div className="h-6 w-full animate-pulse rounded-full bg-[var(--cup-stroke)]" />
        <div className="h-6 w-5/6 animate-pulse rounded-full bg-[var(--cup-stroke)]" />
        <div className="space-y-4 pt-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-pill bg-[var(--cup-stroke)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto mt-32 max-w-xl rounded-card bg-white p-10 text-center shadow-card"
    >
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--cup-error)]">
        Couldn&apos;t open this drink
      </p>
      <p className="font-heading text-k-card text-[var(--cup-espresso)]">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <BigButton variant="secondary" onClick={onBack}>
          Back to menu
        </BigButton>
        <BigButton onClick={onRetry}>Try again</BigButton>
      </div>
    </div>
  );
}
