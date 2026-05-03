'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, GraduationCap, BookOpen, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PromoCard } from '@/components/PromoCard';
import { ProductCard } from '@/components/ProductCard';
import { RoleChip } from '@/components/RoleChip';
import { SearchBar } from '@/components/SearchBar';
import { PageTransition } from '@/components/PageTransition';
import { LoadingDots } from '@/components/LoadingDots';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';
import type { CatalogResponse, UserRole } from '@/lib/types';

type SelectableRole = 'student' | 'faculty' | 'office';

const ROLE_OPTIONS: { role: SelectableRole; icon: LucideIcon }[] = [
  { role: 'student', icon: GraduationCap },
  { role: 'faculty', icon: BookOpen },
  { role: 'office',  icon: Briefcase },
];

function defaultSelectableRole(role: UserRole | undefined): SelectableRole {
  return role === 'faculty' || role === 'office' ? role : 'student';
}

export default function HomePage() {
  const { t, language } = useT();
  const user = useSession((s) => s.user);
  const reduce = useReducedMotion();

  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeRole, setActiveRole] = useState<SelectableRole>(defaultSelectableRole(user?.role));

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

  const popularOffer = catalog?.offers[0] ?? null;

  const filteredProducts = useMemo(() => {
    if (!catalog) return [];
    const query = search.trim().toLowerCase();
    let products = catalog.products.filter((p) => p.is_available);
    if (query) {
      products = products.filter((p) =>
        (language === 'ar' ? p.name_ar : p.name_en).toLowerCase().includes(query),
      );
    }
    // Sort by rating × count to surface the genuinely popular items at the top.
    return [...products].sort((a, b) => b.rating_avg * (b.rating_count + 1) - a.rating_avg * (a.rating_count + 1));
  }, [catalog, search, language]);

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col gap-6 px-5 pt-6">
        {/* Greeting + bell */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="cup-sunrise flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold text-white shadow-[0_6px_16px_rgba(194,65,12,0.25)]"
            >
              {firstName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--cup-muted)]">
                {t('common.goodMorning')}
              </p>
              <h1 className="font-heading text-lg font-bold leading-tight text-[var(--cup-espresso)]">
                {firstName}
              </h1>
            </div>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-subtle text-[var(--cup-cocoa)] transition-colors hover:text-[var(--cup-primary)]"
          >
            <Bell size={18} aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--cup-primary)] ring-2 ring-white"
            />
          </button>
        </header>

        {/* Search */}
        <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} />

        {/* Hero promo */}
        {popularOffer ? (
          <PromoCard
            eyebrow={t('home.todayOnly')}
            headline={`${popularOffer.value}${t('home.offPercent')}`}
            subtitle={t('home.superDiscount')}
            ctaLabel={t('common.orderNow')}
          />
        ) : (
          <PromoCard
            eyebrow={t('home.todayOnly')}
            headline={`70${t('home.offPercent')}`}
            subtitle={t('home.superDiscount')}
            ctaLabel={t('common.orderNow')}
          />
        )}

        {/* Role tabs */}
        <div role="tablist" aria-label="Filter by role" className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {ROLE_OPTIONS.map(({ role, icon }) => (
            <RoleChip
              key={role}
              role={role}
              icon={icon}
              label={t(`roles.${role}`)}
              selected={activeRole === role}
              onSelect={() => setActiveRole(role)}
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
            <div className="mt-6 flex items-center justify-center py-12 text-[var(--cup-muted)]" role="status">
              <LoadingDots />
            </div>
          ) : error ? (
            <div className="mt-6 rounded-card border border-[var(--cup-stroke)] bg-white p-6 text-center">
              <p className="text-sm font-medium text-[var(--cup-error)]">{error}</p>
              <p className="mt-1 text-xs text-[var(--cup-muted)]">
                Make sure the API is running on{' '}
                <code className="font-mono">{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}</code>.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-6 rounded-card border border-[var(--cup-stroke)] bg-white p-8 text-center text-sm text-[var(--cup-muted)]">
              {t('common.noResults')}
            </div>
          ) : (
            <motion.div
              className="mt-4 grid grid-cols-2 gap-3"
              initial={reduce ? false : 'hidden'}
              animate="visible"
              variants={{
                visible: {
                  transition: { staggerChildren: 0.04 },
                },
              }}
            >
              {filteredProducts.slice(0, 8).map((product) => (
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
