'use client';

/**
 * Referral landing — /r/<code>
 * Phase 7.1 of UPGRADE-PLAN.md.
 *
 * Public page (no auth required). Tracks the click via the API, then
 * redirects the visitor to /login with the code stored in
 * localStorage so the OTP-verify flow can forward it as
 * `referralCode`.
 *
 * If the visitor is already signed in, we still record the click but
 * skip the login redirect — they go straight to the menu (the
 * referral can't convert because they're already a user).
 */

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Gift } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

const REFERRAL_STORAGE_KEY = 'cup-co-referral-code';

export default function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const hydrated = useSession((s) => s.hydrated);
  const token = useSession((s) => s.token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const upper = code.toUpperCase();
    api
      .trackReferralClick(upper)
      .then(() => {
        if (cancelled) return;
        // Persist for the OTP-verify step
        try {
          localStorage.setItem(REFERRAL_STORAGE_KEY, upper);
        } catch {
          // localStorage blocked — fall back to URL param later
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError('That referral code looks invalid. We sent you to the menu instead.');
      });
    return () => { cancelled = true; };
  }, [code]);

  // Once hydrated, route the user appropriately.
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      if (token) {
        // Already signed in — go to home; can't convert
        router.replace('/');
      } else {
        router.replace('/login');
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [hydrated, token, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,var(--cup-paper),var(--cup-cream))] px-6">
      <div className="text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cup-primary)] text-white shadow-warm-glow">
          <Gift size={32} aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold text-[var(--cup-espresso)]">
          You&apos;re invited to Cup &amp; Co
        </h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--cup-cocoa)]">
          Sign in or sign up to claim your welcome bonus — and to thank the friend who sent you here.
        </p>
        <p className="mt-4 text-xs font-mono text-[var(--cup-muted)]">
          <Coffee size={11} className="inline align-middle" /> Code: <strong className="text-[var(--cup-primary)]">{code.toUpperCase()}</strong>
        </p>
        {error && (
          <p className="mt-3 text-xs text-[var(--cup-error)]">{error}</p>
        )}
      </div>
    </main>
  );
}
