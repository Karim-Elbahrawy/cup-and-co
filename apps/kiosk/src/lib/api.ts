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
};
