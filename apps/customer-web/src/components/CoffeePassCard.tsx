'use client';

/**
 * Coffee Pass — subscription tier card.
 *
 * Lives on the /rewards page. Self-fetches the user's subscription state on
 * mount, then renders one of three states:
 *
 *   1. NOT subscribed — show the plan + a "Subscribe" CTA
 *   2. Active subscription — show today's status (free drink left? hours
 *      window?), the renewal date, and a "Cancel anytime" link
 *   3. Cancelled-but-still-active — same as (2) but with a "Resubscribe"
 *      CTA so it's a one-tap recovery
 *
 * v1 doesn't run a real payment flow — subscribing immediately activates
 * the pass (matches the existing dev cash-payment behaviour).
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Coffee, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { MySubscriptionResponse, UserSubscription, SubscriptionPlan } from '@/lib/api';
import { useT } from '@/lib/i18n';

export function CoffeePassCard() {
  const { t, language } = useT();
  const [data, setData] = useState<MySubscriptionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await api.mySubscription();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscription');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubscribe(planId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.subscribeToPlan(planId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to subscribe');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.cancelMySubscription();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    // Loading skeleton — same outer shell so layout doesn't jump
    return (
      <div className="rounded-2xl bg-cup-paper p-6 shadow-subtle ring-1 ring-cup-stroke/40">
        <div className="flex items-center gap-2 text-cup-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
        </div>
      </div>
    );
  }

  const sub = data.subscription;
  const plan = sub
    ? data.plans.find((p) => p.id === sub.planId) ?? null
    : data.plans[0] ?? null;

  if (!plan) return null;

  const planName = language === 'ar' ? plan.name_ar : plan.name_en;
  const planDesc = language === 'ar' ? plan.description_ar : plan.description_en;
  const isActiveOrCancelled = sub && (sub.status === 'active' || sub.status === 'cancelled');

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 via-orange-50 to-white p-6 shadow-elevated ring-1 ring-cup-orange-200/60"
      aria-label="Coffee Pass"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-cup-orange-600 text-white shadow-warm-glow">
            <Coffee className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-heading text-base font-bold text-cup-brown-900">{planName}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-orange-700">
              Coffee Pass
            </p>
          </div>
        </div>
        {isActiveOrCancelled && (
          <span className="rounded-full bg-cup-orange-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {sub.status === 'active' ? 'Active' : 'Cancelled'}
          </span>
        )}
      </header>

      <p className="mt-3 text-sm text-cup-brown-700">{planDesc}</p>

      {/* Plan facts — always visible */}
      <ul className="mt-4 space-y-1.5 text-xs text-cup-brown-700">
        <Fact icon={<Check className="h-3 w-3 text-cup-orange-700" />}>
          {plan.daily_drink_credits === 1
            ? '1 free drink every day'
            : `${plan.daily_drink_credits} free drinks every day`}
        </Fact>
        {plan.valid_until_hour != null && (
          <Fact icon={<Check className="h-3 w-3 text-cup-orange-700" />}>
            Valid before {plan.valid_until_hour}:00 every morning
          </Fact>
        )}
        <Fact icon={<Check className="h-3 w-3 text-cup-orange-700" />}>
          {plan.billing_cycle_days} days, EGP {plan.price_egp}
        </Fact>
      </ul>

      {/* Today's status (only if subscribed) */}
      {sub && isActiveOrCancelled && (
        <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-cup-stroke/40 backdrop-blur-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cup-muted">
            Today
          </p>
          <p className="mt-1 text-sm font-semibold text-cup-brown-900">
            {todayStatusLine(data.eligibility, plan)}
          </p>
          <p className="mt-2 text-[11px] text-cup-muted">
            {sub.status === 'cancelled'
              ? `Benefits end ${formatDate(sub.endsAt)}`
              : `Renews ${formatDate(sub.endsAt)}`}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between gap-3">
        {sub && sub.status === 'active' ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="text-xs font-semibold text-cup-muted underline underline-offset-2 hover:text-cup-brown-900 disabled:opacity-50"
          >
            Cancel anytime
          </button>
        ) : (
          <span />
        )}
        {(!sub || sub.status === 'cancelled' || sub.status === 'expired') && (
          <button
            type="button"
            onClick={() => handleSubscribe(plan.id)}
            disabled={busy}
            className="ml-auto flex items-center gap-2 rounded-full bg-cup-orange-600 px-5 py-2.5 font-heading text-sm font-semibold text-white shadow-warm-glow transition active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {sub?.status === 'cancelled' ? 'Resubscribe' : `Subscribe — EGP ${plan.price_egp}/mo`}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      )}
    </motion.section>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function todayStatusLine(
  e: MySubscriptionResponse['eligibility'],
  plan: SubscriptionPlan,
): string {
  if (e.eligible) {
    return e.creditsRemainingToday === 1
      ? '☕ Your free drink is waiting — add any drink to your cart.'
      : `☕ ${e.creditsRemainingToday} free drinks left today.`;
  }
  switch (e.reason) {
    case 'daily_cap_reached':
      return "Already used today's free drink — see you tomorrow!";
    case 'outside_hours':
      return plan.valid_until_hour != null
        ? `Window closed for today. Comes back tomorrow before ${plan.valid_until_hour}:00.`
        : 'Window closed for today.';
    case 'expired':
      return 'Subscription ended.';
    case 'no_subscription':
      return 'Not subscribed yet.';
    default:
      return '';
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
