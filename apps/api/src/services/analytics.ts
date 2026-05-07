/**
 * PostHog server-side analytics — Phase 1.2 of docs/UPGRADE-PLAN.md.
 *
 * The API fires events that originate server-side (status changes, points
 * credits, refunds). Client-fired events (add_to_cart, checkout_started)
 * live in `apps/customer-web/src/lib/analytics.ts`.
 *
 * Events join across platforms via `distinct_id = userId`. PII rule: never
 * pass phone/email — userId only. The PostHog console may auto-resolve user
 * properties from earlier identify calls, which is fine.
 *
 * Gated on `POSTHOG_KEY`: SDK becomes a no-op when unset. Local dev runs
 * without an account; production should always set the key.
 */
import { PostHog } from 'posthog-node';

const posthogKey = process.env.POSTHOG_KEY;
const posthogHost = process.env.POSTHOG_HOST ?? 'https://eu.posthog.com';

let client: PostHog | null = null;

if (posthogKey) {
  client = new PostHog(posthogKey, {
    host: posthogHost,
    // Aggressive flush so order_placed events surface fast in dashboards.
    flushAt: 1,
    flushInterval: 1000,
  });
}

/**
 * Canonical event names — keep in sync with the catalogue in
 * docs/UPGRADE-PLAN.md (Phase 1.2). Adding a new event requires updating
 * BOTH this file AND the catalogue + the web wrapper.
 */
export type ServerAnalyticsEvent =
  | { name: 'signup_completed'; props: { role: string; time_to_complete_sec: number } }
  | { name: 'order_placed'; props: { order_id: string; total: number; payment_method: string; fulfillment: 'pickup' | 'delivery'; item_count: number; points_earned: number; currency: string } }
  | { name: 'order_status_changed'; props: { order_id: string; from_status: string; to_status: string } }
  | { name: 'order_completed'; props: { order_id: string; time_to_completion_min: number } }
  | { name: 'points_earned'; props: { source: 'order' | 'scan' | 'game' | 'referral'; amount: number; new_balance: number } }
  | { name: 'points_redeemed'; props: { discount_amount: number; points_spent: number; new_balance: number } }
  | { name: 'game_completed'; props: { game_id: string; score: number; points_earned: number; lives_lost: number } }
  | { name: 'referral_converted'; props: { referrer_id: string; referee_id: string; reward_amount: number } }
  | { name: 'push_sent'; props: { category: string; user_id: string } };

/**
 * Fire a server-side event. No-op when `POSTHOG_KEY` is unset.
 *
 * @param userId  Cup & Co user ID. The same value the client passes in
 *                `posthog.identify()`. Never pass phone/email.
 */
export function track(userId: string, event: ServerAnalyticsEvent): void {
  if (!client) return;
  try {
    client.capture({
      distinctId: userId,
      event: event.name,
      properties: event.props as Record<string, unknown>,
    });
  } catch {
    // Never let analytics break a request. Silent failure is intentional —
    // Sentry will catch any underlying issue from posthog-node itself.
  }
}

/**
 * Identify a user with stable, non-PII attributes. Call this once per
 * authenticated session so PostHog can attach role/tier/campus metadata to
 * later events without us repeating them.
 */
export function identify(userId: string, attrs: { role?: string; tier?: string; campus_id?: string }): void {
  if (!client) return;
  try {
    client.identify({ distinctId: userId, properties: attrs as Record<string, unknown> });
  } catch {
    // Silent — see comment in `track`.
  }
}

/**
 * Graceful shutdown. Call from server.ts on SIGTERM so in-flight events
 * flush before the process exits.
 */
export async function shutdownAnalytics(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
  } catch {
    // Silent.
  }
}
