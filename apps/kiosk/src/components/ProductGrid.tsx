'use client';

import { useMemo, useState } from 'react';
import type { CatalogResponse, Product } from '@cup-and-co/types';
import { CategoryTabs } from './CategoryTabs';
import { ProductCard } from './ProductCard';
import { FeaturedHero } from './FeaturedHero';
import type { KioskLang } from '@/lib/lang';

/**
 * Catalog grid — category tabs + responsive product grid.
 *
 * Layout:
 *   - 3 columns @ 12.9" portrait, 4 columns @ 12.9" landscape (the kiosk's
 *     designed orientation), 2 columns at the breakpoint where this is
 *     viewed in DevTools (no sub-tablet target — iPad mini isn't supported).
 *   - Tabs sticky at the top behind a frosted-cream backdrop so swiping
 *     the grid keeps category context visible.
 *
 * Out-of-stock cards stay in the grid (greyed) rather than being hidden so
 * regulars can see "the cinnamon roll exists, it's just out today" — that
 * matches the customer-web behaviour set by Phase 3.2 of the upgrade plan.
 */

interface ProductGridProps {
  catalog: CatalogResponse;
  lang: KioskLang;
  onSelectProduct: (product: Product) => void;
  onOutOfStockTap: (product: Product) => void;
}

export function ProductGrid({
  catalog,
  lang,
  onSelectProduct,
  onOutOfStockTap,
}: ProductGridProps) {
  const [selectedCat, setSelectedCat] = useState<string | 'all'>('all');

  const visible = useMemo(() => {
    const inCat = catalog.products.filter(
      (p) => selectedCat === 'all' || p.category_id === selectedCat,
    );
    // Hide unavailable; out-of-stock stays visible (dimmed).
    return inCat.filter((p) => p.is_available);
  }, [catalog.products, selectedCat]);

  // Phase K4.7 — find the first featured product in the visible set. We
  // pin the hero card only on the 'All' tab so category-filtered views
  // stay clean. If multiple products are featured we pick the first by
  // sort_order (catalog already arrives sorted).
  const featured = useMemo(() => {
    if (selectedCat !== 'all') return null;
    return (
      catalog.products.find(
        (p) => p.is_featured_today && p.is_available && !(p.is_out_of_stock || p.stock_count === 0),
      ) ?? null
    );
  }, [catalog.products, selectedCat]);

  // Don't double-render the featured product as a tile in the grid.
  const visibleTiles = useMemo(
    () => (featured ? visible.filter((p) => p.id !== featured.id) : visible),
    [visible, featured],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 -mx-12 mb-6 bg-[var(--cup-paper)]/90 px-12 pb-3 pt-2 backdrop-blur-md">
        <CategoryTabs
          categories={catalog.categories}
          selected={selectedCat}
          lang={lang}
          onSelect={setSelectedCat}
        />
      </div>

      {visible.length === 0 ? (
        <div className="grid h-64 place-items-center text-k-card text-[var(--cup-muted)]">
          {lang === 'ar' ? 'لا توجد منتجات في هذه الفئة' : 'Nothing here yet'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 pb-32 md:grid-cols-3 xl:grid-cols-4">
          {featured ? (
            <FeaturedHero
              product={featured}
              lang={lang}
              onTap={() => onSelectProduct(featured)}
            />
          ) : null}
          {visibleTiles.map((p) => {
            const isOut = p.is_out_of_stock || p.stock_count === 0;
            return (
              <ProductCard
                key={p.id}
                product={p}
                lang={lang}
                onTap={() => (isOut ? onOutOfStockTap(p) : onSelectProduct(p))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
