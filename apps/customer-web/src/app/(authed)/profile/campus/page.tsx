'use client';

/**
 * Profile → Campus selector — Phase 2.2 of UPGRADE-PLAN.md.
 *
 * For v1.5 with a single seeded campus, this page is mostly informational —
 * the user sees their current campus with no real switch to make. The full
 * picker activates the moment a second campus is onboarded.
 *
 * When the user does switch, the cart is intentionally cleared because
 * the menu is campus-scoped (a coffee from campus A may not exist or
 * cost the same on campus B).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Check } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import type { Campus } from '@cup-and-co/types';

export default function CampusPage() {
  const { t, language } = useT();
  const [campuses, setCampuses] = useState<Campus[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clearCart = useCart((s) => s.clear);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listCampuses(), api.myCampus().catch(() => ({ campus: null }))])
      .then(([list, mine]) => {
        if (cancelled) return;
        setCampuses(list.campuses);
        setCurrentId(mine.campus?.id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setCampuses([]);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleSelect(campus: Campus) {
    if (campus.id === currentId) return;
    setSwitching(campus.id);
    setError(null);
    try {
      await api.setMyCampus(campus.id);
      // Cart contents are campus-scoped — clear so the user doesn't try to
      // checkout an item that may not exist on the new campus's menu.
      clearCart();
      setCurrentId(campus.id);
    } catch {
      setError(t('common.error'));
    } finally {
      setSwitching(null);
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--cup-paper)] px-4 pb-24 pt-6">
        <div className="mx-auto max-w-xl space-y-5">
          <header className="flex items-center justify-between">
            <Link
              href="/profile"
              aria-label={t('common.back')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-subtle text-[var(--cup-cocoa)] hover:text-[var(--cup-primary)] transition-colors"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <h1 className="font-heading text-lg font-bold text-[var(--cup-espresso)]">
              {t('campus.title')}
            </h1>
            <span className="h-10 w-10" aria-hidden="true" />
          </header>

          <p className="text-sm text-[var(--cup-cocoa)]">{t('campus.intro')}</p>

          {campuses === null && (
            <p className="text-sm text-[var(--cup-muted)]">{t('common.loading')}</p>
          )}

          {campuses && campuses.length === 0 && (
            <p className="text-sm text-[var(--cup-muted)]">{t('campus.noneAvailable')}</p>
          )}

          {campuses && campuses.length === 1 && (
            <CampusCard
              campus={campuses[0]}
              language={language}
              isCurrent
              isSwitching={false}
              onSelect={() => {}}
            />
          )}

          {campuses && campuses.length > 1 && (
            <ul className="space-y-3">
              {campuses.map((c) => (
                <li key={c.id}>
                  <CampusCard
                    campus={c}
                    language={language}
                    isCurrent={c.id === currentId}
                    isSwitching={switching === c.id}
                    onSelect={() => handleSelect(c)}
                  />
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="text-sm text-[var(--cup-error)]">{error}</p>
          )}

          {campuses && campuses.length > 1 && (
            <p className="text-xs text-[var(--cup-muted)]">
              {t('campus.switchNotice')}
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function CampusCard({
  campus,
  language,
  isCurrent,
  isSwitching,
  onSelect,
}: {
  campus: Campus;
  language: 'en' | 'ar';
  isCurrent: boolean;
  isSwitching: boolean;
  onSelect: () => void;
}) {
  const name = language === 'ar' ? campus.name_ar : campus.name_en;
  const className = [
    'flex w-full items-center gap-4 rounded-card border bg-white p-4 text-start shadow-card transition-colors',
    isCurrent
      ? 'border-[var(--cup-primary)] bg-[var(--cup-cream)]/40'
      : 'border-[var(--cup-stroke)] hover:border-[var(--cup-primary)]',
  ].join(' ');
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isCurrent || isSwitching}
      aria-pressed={isCurrent}
      className={className}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cup-cream)] text-[var(--cup-primary)]">
        <MapPin size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-base font-bold text-[var(--cup-espresso)]">
          {name}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--cup-muted)]">
          {campus.timezone} · {campus.currency}
        </span>
      </span>
      {isCurrent && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cup-primary)] text-white">
          <Check size={14} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
