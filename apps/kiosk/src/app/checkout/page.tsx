'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { BigButton } from '@/components/BigButton';
import { useCart, cartTotalEgp } from '@/lib/cart';
import { useIdleReset } from '@/lib/useIdleReset';
import type { KioskLang } from '@/lib/lang';

/**
 * /checkout — placeholder destination for the cart drawer's Checkout CTA.
 *
 * The real cash-flow + pickup-code screen ships in K1.7. We ship a real
 * route now (rather than a no-op disabled CTA) so:
 *   - The drawer flow is exercisable end-to-end on iPad
 *   - The route's idle-reset + cart-empty guard are already in place
 *     when K1.7 swaps the body for the real cash UI
 *
 * Empty-cart guard: if a customer somehow lands here with an empty cart
 * (deep-link, browser back from confirmation, etc.) we redirect to
 * /catalog — there's nothing to check out.
 */
export default function CheckoutPlaceholder() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clearCart = useCart((s) => s.clear);
  const total = cartTotalEgp(lines);
  const lang = 'en' as KioskLang;

  useIdleReset({
    onIdle: () => {
      clearCart();
      router.replace('/');
    },
    timeoutMs: 90_000,
  });

  // Empty-cart guard. The drawer disables Checkout when empty, but defend
  // in depth — a navigation race or a deep link could still land us here.
  useEffect(() => {
    if (lines.length === 0) {
      router.replace('/catalog');
    }
  }, [lines.length, router]);

  if (lines.length === 0) return null;

  return (
    <main className="grid h-dvh w-dvw place-items-center bg-[var(--cup-paper)] px-12">
      <div className="max-w-3xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.4em] text-[var(--cup-muted)]">
          {lang === 'ar' ? 'إتمام الطلب' : 'Checkout'}
        </p>
        <h1 className="font-heading text-k-hero text-[var(--cup-espresso)]">
          {lang === 'ar' ? 'الدفع قريباً' : 'Payment lands in K1.7.'}
        </h1>
        <p className="mt-6 font-body text-k-card text-[var(--cup-cocoa)]">
          {lang === 'ar'
            ? `إجمالي الطلب: ${total} EGP`
            : `Order total: ${total} EGP — pay-at-counter (cash) and card-payment flows wire up next.`}
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <BigButton
            variant="secondary"
            leadingIcon={<ChevronLeft className="h-7 w-7" />}
            onClick={() => router.replace('/catalog')}
          >
            {lang === 'ar' ? 'العودة للقائمة' : 'Back to menu'}
          </BigButton>
        </div>
      </div>
    </main>
  );
}
