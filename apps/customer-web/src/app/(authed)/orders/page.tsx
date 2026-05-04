'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { ApiOrder } from '@/lib/types';

export default function OrderHistoryPage() {
  const { t } = useT();
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listOrders()
      .then((r) => {
        if (cancelled) return;
        setOrders(r.orders);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-cup-paper pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cup-paper/85 px-5 py-4 backdrop-blur-sm">
        <Link
          href="/"
          aria-label={t('common.back')}
          className="grid h-10 w-10 place-items-center rounded-full border border-cup-stroke bg-white shadow-subtle"
        >
          <ChevronLeft className="h-5 w-5 text-cup-brown-900" />
        </Link>
        <p className="font-heading text-base font-semibold text-cup-brown-900">
          {t('orders.myOrders')}
        </p>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="mx-auto max-w-3xl px-5 pt-2">
        {error && (
          <div className="rounded-card border border-cup-error bg-white p-4 text-sm text-cup-error">
            {error}
          </div>
        )}

        {orders === null && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-cup-stroke" />
            ))}
          </div>
        )}

        {orders && orders.length === 0 && (
          <div className="mt-12 rounded-card border border-cup-stroke bg-white p-6 text-center shadow-card">
            <h2 className="font-heading text-lg font-bold text-cup-brown-900">
              {t('orders.noOrders')}
            </h2>
            <p className="mt-1 text-sm text-cup-muted">{t('orders.noOrdersMessage')}</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-pill bg-cup-orange-600 px-5 py-2 text-sm font-semibold text-white"
            >
              {t('common.orderNow')}
            </Link>
          </div>
        )}

        {orders && orders.length > 0 && (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center gap-3 rounded-card border border-cup-stroke bg-white p-4 shadow-subtle transition hover:shadow-card"
                >
                  <div className="flex-1">
                    <p className="font-heading text-sm font-semibold text-cup-brown-900">
                      Order #{o.pickupCode ?? o.id.slice(0, 6)}
                    </p>
                    <p className="text-xs text-cup-muted">
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-cup-brown-700">
                      {o.items.length} item{o.items.length !== 1 ? 's' : ''} · {t(`orders.${camelize(o.status)}`)}
                    </p>
                  </div>
                  <p className="font-heading text-base font-bold text-cup-orange-700">
                    EGP {o.totalEgp}
                  </p>
                  <ChevronRight className="h-5 w-5 text-cup-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function camelize(s: string): string {
  return s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}
