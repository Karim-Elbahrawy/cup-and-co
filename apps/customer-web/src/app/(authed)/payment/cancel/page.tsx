'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { useT } from '@/lib/i18n';

export default function PaymentCancelPage() {
  const { t } = useT();
  const router = useRouter();

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--cup-paper)] px-6">
        <XCircle size={64} className="text-[var(--cup-warning)]" />
        <h1 className="mt-4 font-heading text-xl font-bold text-[var(--cup-espresso)]">
          Payment Cancelled
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--cup-muted)]">
          Your cart is still saved. You can try again when ready.
        </p>
        <button
          type="button"
          onClick={() => router.replace('/checkout')}
          className="mt-6 rounded-pill bg-[var(--cup-primary)] px-8 py-3 text-sm font-bold text-white shadow-subtle transition-transform active:scale-[0.97]"
        >
          {t('common.checkout')}
        </button>
      </main>
    </PageTransition>
  );
}
