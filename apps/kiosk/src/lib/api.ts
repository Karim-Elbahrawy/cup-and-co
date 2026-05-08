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

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(KIOSK_BEARER ? { Authorization: `Bearer ${KIOSK_BEARER}` } : {}),
      'x-placement-source': 'kiosk',
      ...(init?.headers ?? {}),
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
  placeOrder(args: {
    lines: CartLine[];
    paymentMethod: 'cash';
    notes?: string;
  }): Promise<PlaceOrderResponse> {
    const items = args.lines.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
      options: Object.fromEntries(line.options.map((o) => [o.group, o.nameEn])),
    }));

    return fetchJson<PlaceOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        fulfillmentType: 'pickup',
        paymentMethod: args.paymentMethod,
        redeemPoints: 0,
        items,
        notes: args.notes,
        placementSource: 'kiosk',
      }),
      headers: KIOSK_ID ? { 'x-kiosk-id': KIOSK_ID } : {},
    });
  },
};

/** Per-device kiosk identity. Provisioned per iPad in K6's admin flow. */
const KIOSK_ID = process.env.NEXT_PUBLIC_KIOSK_ID ?? '';
