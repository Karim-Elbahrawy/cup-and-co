'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PromoCard } from '@/components/PromoCard';
import { ProductCard } from '@/components/ProductCard';
import { CategoryChip } from '@/components/CategoryChip';
import { DailyOrderBar } from '@/components/DailyOrderBar';
import { OffersCarousel } from '@/components/OffersCarousel';
import { StreakWidget } from '@/components/StreakWidget';
import { SuggestionCard } from '@/components/SuggestionCard';
import { PageTransition } from '@/components/PageTransition';
import { SkeletonProductGrid } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { UserAvatar } from '@/components/UserAvatar';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';
import type { CatalogResponse } from '@/lib/types';



function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'home.goodMorning';
  if (h < 17) return 'home.goodAfternoon';
  return 'home.goodEvening';
}

export default function HomePage() {
  const { t, language } = useT();
  const user = useSession((s) => s.user);
  const reduce = useReducedMotion();

  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .catalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const firstName = useMemo(() => {
    if (!user) return 'there';
    if (user.fullName) return user.fullName.split(' ')[0];
    // Fall back to last 4 digits of phone so the greeting still feels personal.
    return user.phone ? `+…${user.phone.slice(-4)}` : 'there';
  }, [user]);

  const featuredPromoProduct = useMemo(() => {
    if (!catalog) return null;
    return (
      catalog.products.find((product) => product.image_url.includes('cold_coffee')) ??
      catalog.products.find((product) => product.image_url.includes('hot_coffee')) ??
      catalog.products[0] ??
      null
    );
  }, [catalog]);
  const featuredPromoCutout = useMemo(() => {
    if (!featuredPromoProduct) return null;
    return featuredPromoProduct.image_url.replace('.png', '-cutout.png');
  }, [featuredPromoProduct]);
  const promoTheme = featuredPromoProduct?.image_url.includes('cold_coffee') ? 'cold' : 'hot';
  const promoPosterImage = useMemo(() => {
    const locale = language === 'ar' ? 'ar' : 'en';
    const kind = promoTheme === 'cold' ? 'cold' : 'hot';
    return `/brand/posters/offer-${kind}-${locale}.svg`;
  }, [language, promoTheme]);

  const filteredProducts = useMemo(() => {
    if (!catalog) return [];
    const query = search.trim().toLowerCase();
    let products = catalog.products.filter((p) => p.is_available);
    if (activeCategory !== 'all') {
      products = products.filter((p) => p.category_id === activeCategory);
    }
    if (query) {
      products = products.filter((p) =>
        (language === 'ar' ? p.name_ar : p.name_en).toLowerCase().includes(query),
      );
    }
    // Sort by rating × count to surface the genuinely popular items at the top.
    return [...products].sort((a, b) => b.rating_avg * (b.rating_count + 1) - a.rating_avg * (a.rating_count + 1));
  }, [catalog, search, language, activeCategory]);

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-6 px-5 pt-6">
        {/* Greeting + bell */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={user?.fullName ?? user?.phone ?? firstName}
              phone={user?.phone}
              avatarId={user?.avatarId ?? null}
              avatarUrl={user?.avatarUrl ?? null}
              size="sm"
              className="shadow-[0_6px_16px_rgba(194,65,12,0.25)]"
            />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--cup-muted)]">
                {t(greetingKey())}
              </p>
              <h1 className="font-heading text-lg font-bold leading-tight text-[var(--cup-espresso)]">
                {firstName}
              </h1>
            </div>
          </div>
        </header>

        {/* Phase 6.4 smart suggestion — silently hides when none / dismissed */}
        <SuggestionCard />

        {/* Daily habit / quick-order bar */}
        <DailyOrderBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('common.search')}
        />

        {/* Phase 6.2 streak widget — renders nothing for current_streak === 0 */}
        <StreakWidget />

        {/* Hero promo */}
        <PromoCard
          ctaLabel={t('common.orderNow')}
          featuredImageUrl={featuredPromoCutout}
          posterImageUrl={promoPosterImage}
          theme={promoTheme}
          onCtaClick={() => document.getElementById('popular-heading')?.scrollIntoView({ behavior: 'smooth' })}
        />

        {/* Active offers — outstanding swipe carousel */}
        {catalog && catalog.offers.length > 0 && (
          <OffersCarousel
            offers={catalog.offers}
            language={language}
            label={t('common.activeOffers')}
          />
        )}

        {/* Category tabs */}
        <div role="tablist" aria-label={t('common.filter')} className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          <CategoryChip
            label={t('home.categories.all' as any) || (language === 'ar' ? 'الكل' : 'All')}
            selected={activeCategory === 'all'}
            onSelect={() => setActiveCategory('all')}
          />
          {catalog?.categories
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((cat) => (
            <CategoryChip
              key={cat.id}
              label={language === 'ar' ? cat.name_ar : cat.name_en}
              selected={activeCategory === cat.id}
              onSelect={() => setActiveCategory(cat.id)}
            />
          ))}
        </div>

        {/* Popular section */}
        <section aria-labelledby="popular-heading">
          <div className="flex items-end justify-between">
            <h2 id="popular-heading" className="font-heading text-xl font-bold text-[var(--cup-espresso)]">
              {t('home.categories.popular')}
            </h2>
            <Link
              href="/search"
              className="text-sm font-semibold text-[var(--cup-primary)] hover:text-[var(--cup-primary-hover)]"
            >
              {t('common.seeAll')} →
            </Link>
          </div>

          {loading ? (
            <div className="mt-6" role="status" aria-label={t('common.loading')}>
              <SkeletonProductGrid count={4} />
            </div>
          ) : error ? (
            <div className="mt-6">
              <ErrorState
                message={error}
                onRetry={() => {
                  setLoading(true);
                  setError(null);
                  api.catalog().then(setCatalog).catch((err: unknown) => setError(err instanceof Error ? err.message : t('common.error'))).finally(() => setLoading(false));
                }}
              />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-6 rounded-card border border-[var(--cup-stroke)] bg-white p-8 text-center text-sm text-[var(--cup-muted)]">
              {t('common.noResults')}
            </div>
          ) : (
            <motion.div
              className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              initial={reduce ? false : 'hidden'}
              animate="visible"
              variants={{
                visible: {
                  transition: { staggerChildren: 0.04 },
                },
              }}
            >
              {filteredProducts.slice(0, 12).map((product) => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
