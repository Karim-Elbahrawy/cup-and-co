/**
 * PostHog client-side analytics — Phase 1.2 of docs/UPGRADE-PLAN.md.
 *
 * Companion to `apps/api/src/services/analytics.ts`. Events fired here
 * collapse with API events on the same `distinct_id` (= Cup & Co user_id).
 *
 * Gated on `NEXT_PUBLIC_POSTHOG_KEY`. Without the key, every function is
 * a no-op — local dev runs fine without an account.
 *
 * No `'use client'` directive — every function is `typeof window` guarded
 * so it can be imported from non-client modules (e.g., the zustand store)
 * without forcing them into the client bundle.
 */
import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com',
    // We fire pageviews manually for control + RTL/locale tagging.
    capture_pageview: false,
    // Autocapture creates noisy data and risks PII. We use the explicit
    // catalogue from UPGRADE-PLAN.md instead.
    autocapture: false,
    // No session recording — we handle phone numbers and payments.
    disable_session_recording: true,
    // Respect Do Not Track.
    respect_dnt: true,
    // Person profiles for identified users only — anonymous browse stays
    // anonymous until login, then gets aliased.
    person_profiles: 'identified_only',
  });
  initialized = true;
}

/**
 * Canonical client-side events. Adding one requires updating BOTH this
 * union AND the catalogue in docs/UPGRADE-PLAN.md.
 */
export type ClientAnalyticsEvent =
  | { name: 'app_opened'; props: { platform: 'web'; app_version: string; is_first_open: boolean } }
  | { name: 'page_viewed'; props: { path: string; locale: string } }
  | { name: 'signup_started'; props: { platform: 'web' } }
  | { name: 'product_viewed'; props: { product_id: string; category: string; price: number; position_in_list: number | null } }
  | { name: 'product_customized'; props: { product_id: string; size?: string; sugar?: string; ice?: string; shots?: string } }
  | { name: 'add_to_cart'; props: { product_id: string; quantity: number; unit_price: number; currency: string } }
  | { name: 'cart_viewed'; props: { item_count: number; subtotal: number; currency: string } }
  | { name: 'checkout_started'; props: { subtotal: number; item_count: number; currency: string } }
  | { name: 'payment_method_selected'; props: { method: 'card' | 'wallet' | 'cash' | 'apple_pay' | 'google_pay' } }
  | { name: 'coupon_applied'; props: { code: string; discount_amount: number; valid: boolean } }
  | { name: 'game_started'; props: { game_id: 'coffee_collector' } }
  | { name: 'referral_invited'; props: { channel: 'whatsapp' | 'copy' | 'other' } }
  | { name: 'notification_permission_prompted'; props: { platform: 'web' } }
  | { name: 'notification_permission_granted'; props: { platform: 'web' } };

export function track(event: ClientAnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  if (!initialized) return;
  try {
    posthog.capture(event.name, event.props as Record<string, unknown>);
  } catch {
    // Silent — never let analytics break a render.
  }
}

/**
 * Identify the current user. Call after sign-in completes. Subsequent
 * events will be attached to this user's PostHog person.
 */
export function identify(userId: string, attrs: { role?: string; tier?: string; campus_id?: string }): void {
  if (typeof window === 'undefined') return;
  if (!initialized) return;
  try {
    posthog.identify(userId, attrs as Record<string, unknown>);
  } catch {
    // Silent.
  }
}

/**
 * Reset on sign-out so subsequent anonymous activity doesn't bind to the
 * previous user.
 */
export function resetAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!initialized) return;
  try {
    posthog.reset();
  } catch {
    // Silent.
  }
}
