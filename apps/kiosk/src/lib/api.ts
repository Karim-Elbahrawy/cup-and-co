/**
 * Minimal kiosk API client.
 *
 * This is intentionally not a copy of customer-web's `lib/api.ts` — that
 * file carries auth, refresh-token rotation, and analytics hooks none of
 * which the kiosk needs. The kiosk talks to the API as a kiosk-bearer
 * client (per docs/KIOSK-PLAN.md K1.12) and never has a per-user JWT.
 *
 * For K1.2 we only need read access to /catalog. Order placement, coupons,
 * etc. are added in later kiosk phases. We keep things explicit until we
 * see a real second consumer of this module.
 */

import type { CatalogResponse, ProductDetailResponse } from '@cup-and-co/types';
import type { CartLine } from './cart';

/**
 * Subset of the API's order-create response that the kiosk needs. The API
 * returns more (timeline, full Order shape) but the kiosk only consumes
 * what it renders on the confirmation screen — pickupCode + prepEta + a
 * minimal order object for receipt purposes.
 */
export interface PlaceOrderResponse {
  order: {
    id: string;
    pickupCode: string | null;
    totalEgp: number;
    paymentMethod: 'cash' | 'paymob_card' | 'paymob_wallet';
    placementSource: 'customer_app' | 'kiosk' | 'admin_phone';
    kioskId: string | null;
    createdAt: string;
  };
  prepEta: { minutes: number; basis: string };
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Resolved at runtime — Next inlines NEXT_PUBLIC_* into the client bundle. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Bearer token. Until K1.12 ships server-side kiosk auth this is a no-op
 * passthrough — the API allows /catalog reads anonymously. We still send
 * the header so middleware can identify the request as kiosk traffic for
 * future analytics segmentation.
 */
const KIOSK_BEARER = process.env.NEXT_PUBLIC_KIOSK_BEARER ?? '';

/** Per-device kiosk identity. Provisioned per iPad in K6's admin flow. */
const KIOSK_ID = process.env.NEXT_PUBLIC_KIOSK_ID ?? '';

/**
 * Fetch helper. By default sends the kiosk-bearer auth + x-kiosk-id.
 * Pass `userJwt` to override with an identified customer's JWT — used
 * by post-OTP-verify endpoints where the order should be attributed to
 * the real user, not the synthetic kiosk:<uuid>. The x-kiosk-id header
 * is preserved either way so the API still tags placement_source='kiosk'.
 */
async function fetchJson<T>(
  path: string,
  init?: RequestInit & { userJwt?: string },
): Promise<T> {
  const { userJwt, ...rest } = init ?? {};
  const authHeader = userJwt
    ? `Bearer ${userJwt}`
    : KIOSK_BEARER
      ? `Bearer ${KIOSK_BEARER}`
      : undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
      'x-placement-source': 'kiosk',
      ...(KIOSK_ID ? { 'x-kiosk-id': KIOSK_ID } : {}),
      ...(rest.headers ?? {}),
    },
    // No credentials — the kiosk has no cookies. Avoids leaking session
    // cookies if the kiosk ever shares a domain with the customer site.
    credentials: 'omit',
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

export const api = {
  /**
   * GET /catalog — returns categories, products, offers, kiosk hours.
   * `q` performs server-side ILIKE search across name+description (used in
   * K7's voice search; not exposed in K1.2 UI yet but trivial to surface).
   */
  getCatalog(q?: string): Promise<CatalogResponse> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return fetchJson<CatalogResponse>(`/catalog${qs}`);
  },

  /**
   * GET /products/:id — full detail (product + options + reviews + flags).
   * The kiosk uses options to render the customization screen (K1.3); the
   * `reviews` and `is_favorited` fields are ignored by the kiosk because
   * we render anonymous-by-default.
   */
  getProductDetail(productId: string): Promise<ProductDetailResponse> {
    return fetchJson<ProductDetailResponse>(`/products/${encodeURIComponent(productId)}`);
  },

  /**
   * POST /orders — places a kiosk order.
   *
   * The cart store is mapped down to the API's `{ productId, quantity,
   * options }` schema. Options are sent as `{ groupName: optionName_en }`;
   * the API matches against either name_en or name_ar so EN is fine
   * regardless of customer language.
   *
   * Server is the source of truth for placement_source — when the kiosk
   * bearer is set the API ignores any body field and stamps 'kiosk' itself.
   * Sending it from the body anyway is belt-and-braces for environments
   * without KIOSK_BEARER_TOKEN configured (e.g. local dev).
   */
  /**
   * POST /orders — places a kiosk order.
   *
   * If `userJwt` is provided (post-OTP-verify), the order is attributed
   * to the identified user — points credit, streak ticks, and order
   * history all light up. If omitted, the kiosk-bearer auth is used and
   * the order goes against the synthetic kiosk:<uuid>.
   *
   * Either way the API stamps placement_source='kiosk' because we send
   * x-kiosk-id (handled in fetchJson).
   */
  /**
   * Build the POST /orders body without sending. Exported so the offline
   * queue can stash the exact same shape we'd otherwise transmit, and
   * later replay it verbatim on reconnect.
   */
  buildOrderBody(args: {
    lines: CartLine[];
    paymentMethod: 'cash';
    notes?: string;
    redeemPoints?: number;
  }): Record<string, unknown> {
    const items = args.lines.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
      options: Object.fromEntries(line.options.map((o) => [o.group, o.nameEn])),
    }));
    return {
      fulfillmentType: 'pickup',
      paymentMethod: args.paymentMethod,
      redeemPoints: args.redeemPoints ?? 0,
      items,
      notes: args.notes,
    };
  },

  /**
   * Send a pre-built order body to /orders. Lets the offline-queue
   * flush replay an identical body across retries without re-deriving
   * from a possibly-mutated cart store.
   */
  postOrder(body: Record<string, unknown>, userJwt?: string): Promise<PlaceOrderResponse> {
    return fetchJson<PlaceOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
      userJwt,
    });
  },

  placeOrder(args: {
    lines: CartLine[];
    paymentMethod: 'cash';
    notes?: string;
    userJwt?: string;
    redeemPoints?: number;
  }): Promise<PlaceOrderResponse> {
    return fetchJson<PlaceOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(this.buildOrderBody(args)),
      userJwt: args.userJwt,
    });
  },

  /**
   * POST /auth/otp/send — request an OTP for a phone (K4.4).
   * Reuses the customer-app endpoint as-is.
   */
  sendOtp(phone: string): Promise<{ ok: true; devCode?: string }> {
    return fetchJson<{ ok: true; devCode?: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  /**
   * POST /auth/otp/verify — verify an OTP and receive a session JWT (K4.4).
   *
   * Returns the session token + the freshly resolved user record. The
   * kiosk stashes the token in useIdentified and follows up with getMe()
   * to populate name + tier + points for the welcome banner.
   */
  verifyOtp(
    phone: string,
    code: string,
  ): Promise<{
    token: string;
    user: { id: string; phone: string; role: string };
  }> {
    return fetchJson('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  },

  /**
   * POST /orders/:id/kiosk-rating — submit a thumbs-up / thumbs-down
   * for the just-placed order (K7.3). Idempotent server-side; if the
   * customer somehow submits twice the second call returns ok with
   * alreadyRated=true and the kiosk leaves the success state intact.
   */
  rateKioskOrder(orderId: string, rating: 'up' | 'down'): Promise<{ ok: true; alreadyRated: boolean }> {
    return fetchJson(`/orders/${encodeURIComponent(orderId)}/kiosk-rating`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  },

  /**
   * GET /me — fetch the identified customer's profile snapshot. Powers
   * the welcome banner: name + tier + points balance.
   */
  getMe(userJwt: string): Promise<{
    user: { id: string; full_name?: string | null };
    points: number;
    tier: 'bronze' | 'silver' | 'gold';
  }> {
    return fetchJson('/me', { userJwt });
  },

  /**
   * GET /me/usual — most-ordered product over the last 60 days with the
   * customer's most common options pre-applied. Returns null if there's
   * no clear "usual" yet (need ≥ 2 orders of the same product).
   */
  getMyUsual(userJwt: string): Promise<{
    usual: {
      productId: string;
      productNameEn: string;
      productNameAr: string;
      imageUrl: string;
      basePriceEgp: number;
      orderCount: number;
      preferredOptions: Record<string, string>;
    } | null;
  }> {
    return fetchJson('/me/usual', { userJwt });
  },

  /**
   * GET /me/suggestion — fallback when /me/usual returns null. Picks a
   * smart product based on history + time-of-day + season.
   */
  getMySuggestion(userJwt: string): Promise<{
    suggestion: {
      productId: string;
      productNameEn: string;
      productNameAr: string;
      imageUrl: string;
      basePriceEgp: number;
      reason: 'history' | 'season' | 'bestseller';
    } | null;
  }> {
    return fetchJson('/me/suggestion', { userJwt });
  },
};
