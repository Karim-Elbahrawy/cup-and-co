'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function PaymentSuccessPage() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('order_id') ?? params.get('merchant_order_id');
  const [status, setStatus] = useState<'polling' | 'paid' | 'error'>('polling');

  useEffect(() => {
    if (!orderId) {
      setStatus('error');
      return;
    }
    let attempts = 0;
    const poll = setInterval(async () => {
      try {
        const { order } = await api.getOrder(orderId);
        if (order.paymentStatus === 'paid') {
          clearInterval(poll);
          setStatus('paid');
          setTimeout(() => router.replace(`/orders/${orderId}`), 1500);
        }
      } catch {
        // retry
      }
      attempts++;
      if (attempts > 20) {
        clearInterval(poll);
        setStatus('paid');
        router.replace(`/orders/${orderId}`);
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [orderId, router]);

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--cup-paper)] px-6">
        {status === 'polling' && (
          <>
            <Loader2 size={48} className="animate-spin text-[var(--cup-primary)]" />
            <p className="mt-4 text-sm font-medium text-[var(--cup-muted)]">
              {t('common.loading')}
            </p>
          </>
        )}
        {status === 'paid' && (
          <>
            <CheckCircle2 size={64} className="text-[var(--cup-success)]" />
            <h1 className="mt-4 font-heading text-xl font-bold text-[var(--cup-espresso)]">
              Payment Successful
            </h1>
            <p className="mt-2 text-sm text-[var(--cup-muted)]">Redirecting to your order...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-lg font-semibold text-[var(--cup-espresso)]">{t('common.error')}</p>
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="mt-4 rounded-pill bg-[var(--cup-primary)] px-6 py-2.5 text-sm font-semibold text-white"
            >
              {t('nav.home')}
            </button>
          </>
        )}
      </main>
    </PageTransition>
  );
}
