'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { PageTransition } from '@/components/PageTransition';
import { SkeletonProductGrid } from '@/components/Skeleton';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { CatalogResponse } from '@/lib/types';

export default function SearchPage() {
  const { t, language } = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogResponse['products']>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchProducts(query.trim());
        setResults(data.products);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <PageTransition>
      <main className="min-h-screen bg-[var(--cup-paper)] px-4 pb-28 pt-6">
        <div className="relative mb-6">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--cup-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search')}
            autoFocus
            className="w-full rounded-pill bg-white py-3.5 pl-11 pr-4 text-sm shadow-subtle outline-none ring-1 ring-[var(--cup-stroke)] placeholder:text-[var(--cup-muted)] focus:ring-[var(--cup-primary)]"
          />
        </div>

        {loading && <SkeletonProductGrid />}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-[var(--cup-espresso)]">{t('common.noResults')}</p>
            <p className="mt-2 text-sm text-[var(--cup-muted)]">
              {language === 'ar' ? 'جرّب "كابتشينو" أو "موكا"' : 'Try "cappuccino" or "mocha"'}
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    </PageTransition>
  );
}
