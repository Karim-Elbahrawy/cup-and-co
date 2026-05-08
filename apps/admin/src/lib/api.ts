/**
 * Minimal fetch wrapper for the admin dashboard.
 *
 * - Prepends NEXT_PUBLIC_API_URL.
 * - Reads the admin session from localStorage and adds the API's dev-mode
 *   bypass headers (`x-user-id`, `x-user-role`, `x-user-phone`,
 *   `x-verification-status`). When real Supabase admin auth lands we'll swap
 *   the header builder for a Bearer token; the call sites won't change.
 * - Throws a typed `ApiError` on non-2xx so screens can render real messages.
 */

import { getSession } from './session';
import { getStoredCampusId } from './campus';
import type { Campus } from '@cup-and-co/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function buildAuthHeaders(): Record<string, string> {
  const session = getSession();
  if (!session) return {};
  const headers: Record<string, string> = {
    'x-user-id': session.userId,
    'x-user-role': session.role,
    'x-user-phone': session.phone,
    'x-verification-status': 'approved',
  };
  // Phase 2.3: forward the currently-selected admin campus to the API.
  // The server-side filter is queued for after API state moves off
  // in-memory Maps; sending the header now makes the wire format ready.
  const campusId = getStoredCampusId();
  if (campusId) {
    headers['x-admin-campus-id'] = campusId;
  }
  return headers;
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  signal?: AbortSignal;
  /** When true, skip the auth headers (used by login if/when we add a real endpoint). */
  anonymous?: boolean;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, anonymous = false } = options;
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(anonymous ? {} : buildAuthHeaders()),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: 'no-store',
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Request failed (${res.status}).`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

// Typed helpers — keep the call sites tidy.

import type { OrderStatus, Product, ProductOption } from '@cup-and-co/types';

export interface AdminOrderItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  imageUrl: string;
  quantity: number;
  options: Record<string, string>;
  unitPriceEgp: number;
  lineTotalEgp: number;
}

export interface AdminStatusEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface AdminOrder {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentType: 'pickup' | 'delivery';
  subtotalEgp: number;
  discountEgp: number;
  totalEgp: number;
  pointsAwarded: number;
  pointsRedeemed: number;
  pickupCode: string | null;
  createdAt: string;
  scheduledFor: string | null;
  notes: string | null;
  pickedUpAt: string | null;
  /** Phase 2: API now returns full line items on every order list response. */
  items: AdminOrderItem[];
  statusHistory: AdminStatusEvent[];
  /** Phase K1.11 — channel that placed the order. The kiosk surface
   *  badges these so baristas know an in-cafe self-served order is
   *  ready for cash-at-counter pickup. Older rows from before the
   *  migration default to 'customer_app'. */
  placementSource?: 'customer_app' | 'kiosk' | 'admin_phone';
  /** Phase K1.11 — kiosk that placed the order (null for non-kiosk channels). */
  kioskId?: string | null;
}

export interface AdminTimelineStep {
  status: OrderStatus;
  label: string;
  at: string | null;
  active: boolean;
  done: boolean;
}

export interface AdminSummary {
  todayRevenueEgp: number;
  activeOrders: number;
  fullReportsVisible: boolean;
  kioskOpen?: boolean;
  lowStockCount?: number;
}

/**
 * Mirror of `ReceiptRecord` from the API — `expiresAt`/`createdAt` arrive as
 * ISO strings over the wire even though the service types them as `Date`.
 */
export interface AdminQrReceipt {
  token: string;
  orderTotalEgp: number;
  createdByAdminId: string;
  createdAt: string;
  expiresAt: string;
  claimedByUserId: string | null;
  claimedAt: string | null;
}

export interface AdminKioskStatus {
  is_open: boolean;
  message_en: string | null;
  message_ar: string | null;
  capacity_per_slot: number;
  slot_minutes: number;
  opens_at: string;
  closes_at: string;
}

export type AdminKioskPatch = Partial<AdminKioskStatus>;

export interface AdminReview {
  id: string;
  userId: string;
  productId: string;
  orderId: string | null;
  rating: number;
  comment: string;
  hidden: boolean;
  createdAt: string;
  userName?: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  full_name: string | null;
  role: string;
  verification_status: string;
  blocked: boolean;
  created_at: string;
}

export interface AdminOffer {
  id: string;
  name_en: string;
  name_ar: string;
  type: 'percentage' | 'fixed' | 'free_item';
  value: number;
  starts_at: string;
  ends_at: string;
  target_roles: string[];
  code: string | null;
  usage_limit: number | null;
  usage_count: number;
}

export interface AdminReportRevenue {
  todayRevenueEgp: number;
  totalRevenueEgp: number;
  paidOrders: number;
}

export interface AdminReportTopItem {
  name_en: string;
  count: number;
  revenue: number;
}

export interface AdminReportRoleBreakdown {
  breakdown: Record<string, { orders: number; revenue: number }>;
}

export interface AdminReportReviewsByProduct {
  productId: string;
  name_en: string;
  reviewCount: number;
  avgRating: number;
  hiddenCount: number;
  ratingDistribution: Record<string, number>;
}

export interface AdminReportReviews {
  total: number;
  avgRating: number;
  hiddenCount: number;
  ratingDistribution: Record<string, number>;
  byProduct: AdminReportReviewsByProduct[];
}

export interface AdminRevenueTrendEntry {
  date: string;
  revenue: number;
  orders: number;
}

export interface AdminPeakHourEntry {
  hour: number;
  count: number;
}

export interface AdminAuditEntry {
  id: string;
  adminId: string;
  adminRole: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface AdminCategory {
  id: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
}

export const adminApi = {
  listOrders: (signal?: AbortSignal) =>
    api<{ orders: AdminOrder[] }>('/admin/orders', { signal }),
  getOrder: (id: string, signal?: AbortSignal) =>
    api<{ order: AdminOrder; timeline: AdminTimelineStep[] }>(`/admin/orders/${id}`, { signal }),
  updateOrderStatus: (id: string, status: OrderStatus, note?: string) =>
    api<{ order: AdminOrder; timeline: AdminTimelineStep[] }>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: { status, ...(note ? { note } : {}) },
    }),
  cancelOrder: (id: string, note?: string) =>
    api<{ order: AdminOrder; timeline: AdminTimelineStep[] }>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: { status: 'cancelled', ...(note ? { note } : {}) },
    }),
  refundOrder: (id: string, note?: string) =>
    api<{ order: AdminOrder; timeline: AdminTimelineStep[] }>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: { status: 'refunded', ...(note ? { note } : {}) },
    }),
  summary: (signal?: AbortSignal) => api<AdminSummary>('/admin/summary', { signal }),
  createQrReceipt: (orderTotalEgp: number) =>
    api<AdminQrReceipt>('/admin/qr-receipts', {
      method: 'POST',
      body: { orderTotalEgp },
    }),
  getKioskStatus: (signal?: AbortSignal) =>
    api<AdminKioskStatus>('/admin/kiosk/status', { signal }),
  updateKioskStatus: (patch: AdminKioskPatch) =>
    api<AdminKioskStatus>('/admin/kiosk/status', {
      method: 'PATCH',
      body: patch,
    }),
  setProductAvailability: (productId: string, available: boolean) =>
    api<{ id: string; available: boolean }>(
      `/admin/menu/products/${productId}/availability`,
      { method: 'PATCH', body: { available } },
    ),
  // Phase 3.2 — staff out-of-stock toggle (separate from availability and
  // from the numeric `setProductStock` count below). The two endpoints
  // share the URL but accept different payloads server-side.
  setProductOutOfStock: (
    productId: string,
    isOutOfStock: boolean,
    outOfStockUntil?: string | null,
  ) =>
    api<{ id: string; is_out_of_stock: boolean; out_of_stock_until: string | null }>(
      `/admin/menu/products/${productId}/stock`,
      {
        method: 'PATCH',
        body: { is_out_of_stock: isOutOfStock, out_of_stock_until: outOfStockUntil ?? null },
      },
    ),
  getProductStock: (productId: string, signal?: AbortSignal) =>
    api<{ id: string; is_out_of_stock: boolean; out_of_stock_until: string | null }>(
      `/admin/menu/products/${productId}/stock`,
      { signal },
    ),
  createProduct: (input: {
    category_id: string;
    name_en: string;
    name_ar: string;
    description_en?: string | null;
    description_ar?: string | null;
    base_price_egp: number;
    image_url?: string | null;
    prep_minutes?: number | null;
  }) =>
    api<{ product: import('@cup-and-co/types').Product }>('/admin/menu/products', {
      method: 'POST',
      body: input,
    }),
  updateProduct: (
    id: string,
    input: Partial<{
      category_id: string;
      name_en: string;
      name_ar: string;
      description_en: string | null;
      description_ar: string | null;
      base_price_egp: number;
      image_url: string | null;
      prep_minutes: number | null;
      is_available: boolean;
    }>,
  ) =>
    api<{ product: import('@cup-and-co/types').Product }>(`/admin/menu/products/${id}`, {
      method: 'PATCH',
      body: input,
    }),
  deleteProduct: (id: string) =>
    api<void>(`/admin/menu/products/${id}`, { method: 'DELETE' }),
  setProductReviewMode: (productId: string, review_mode: 'full' | 'write_only' | 'hidden') =>
    api<{ id: string; review_mode: 'full' | 'write_only' | 'hidden' }>(
      `/admin/menu/products/${productId}/review-mode`,
      { method: 'PATCH', body: { review_mode } },
    ),
  setProductStock: (productId: string, stock_count: number | null) =>
    api<{ id: string; stock_count: number | null }>(
      `/admin/menu/products/${productId}/stock`,
      { method: 'PATCH', body: { stock_count } },
    ),
  // Phase 5: Reviews
  listReviews: (signal?: AbortSignal) =>
    api<{ reviews: AdminReview[] }>('/admin/reviews', { signal }),
  setReviewVisibility: (id: string, hidden: boolean) =>
    api<{ id: string; hidden: boolean }>(`/admin/reviews/${id}/visibility`, {
      method: 'PATCH',
      body: { hidden },
    }),
  // Phase 5: Users
  listUsers: (status?: string, signal?: AbortSignal) =>
    api<{ users: AdminUser[] }>(`/admin/users${status ? `?status=${status}` : ''}`, { signal }),
  verifyUser: (id: string, status: 'approved' | 'rejected') =>
    api<{ id: string; verification_status: string }>(`/admin/users/${id}/verify`, {
      method: 'PATCH',
      body: { status },
    }),
  blockUser: (id: string, blocked: boolean) =>
    api<{ id: string; blocked: boolean }>(`/admin/users/${id}/block`, {
      method: 'PATCH',
      body: { blocked },
    }),
  // Phase 5: Offers
  listOffers: (scope?: string, signal?: AbortSignal) =>
    api<{ offers: AdminOffer[] }>(`/admin/offers${scope ? `?scope=${scope}` : ''}`, { signal }),
  createOffer: (body: Omit<AdminOffer, 'id' | 'usage_count'>) =>
    api<AdminOffer>('/admin/offers', { method: 'POST', body }),
  updateOffer: (id: string, body: Partial<Omit<AdminOffer, 'id' | 'usage_count'>>) =>
    api<AdminOffer>(`/admin/offers/${id}`, { method: 'PATCH', body }),
  // Phase 5: Reports
  getRevenueReport: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminReportRevenue>(`/admin/reports/revenue${qs ? `?${qs}` : ''}`, { signal });
  },
  getTopItems: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<{ topItems: AdminReportTopItem[] }>(`/admin/reports/top-items${qs ? `?${qs}` : ''}`, { signal });
  },
  getRoleBreakdown: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminReportRoleBreakdown>(`/admin/reports/role-breakdown${qs ? `?${qs}` : ''}`, { signal });
  },
  getReviewsReport: (signal?: AbortSignal) =>
    api<AdminReportReviews>('/admin/reports/reviews', { signal }),
  getRevenueTrend: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<{ days: AdminRevenueTrendEntry[] }>(`/admin/reports/revenue-trend${qs ? `?${qs}` : ''}`, { signal });
  },
  getPeakHours: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<{ hours: AdminPeakHourEntry[] }>(`/admin/reports/peak-hours${qs ? `?${qs}` : ''}`, { signal });
  },
  getAuditLog: (params?: { action?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
    return api<{ entries: AdminAuditEntry[]; total: number }>(`/admin/audit-log${qs ? `?${qs}` : ''}`, { signal });
  },
  // Product options CRUD
  listProductOptions: (productId: string, signal?: AbortSignal) =>
    api<{ options: ProductOption[] }>(`/admin/menu/products/${productId}/options`, { signal }),
  addProductOption: (productId: string, body: Omit<ProductOption, 'id'>) =>
    api<{ option: ProductOption }>(`/admin/menu/products/${productId}/options`, { method: 'POST', body }),
  updateProductOption: (productId: string, optionId: string, body: Partial<Omit<ProductOption, 'id'>>) =>
    api<{ option: ProductOption }>(`/admin/menu/products/${productId}/options/${optionId}`, { method: 'PATCH', body }),
  deleteProductOption: (productId: string, optionId: string) =>
    api<{ ok: boolean }>(`/admin/menu/products/${productId}/options/${optionId}`, { method: 'DELETE' }),
  // Category CRUD
  createCategory: (body: { name_en: string; name_ar: string; sort_order?: number }) =>
    api<{ category: AdminCategory }>('/admin/menu/categories', { method: 'POST', body }),
  updateCategory: (id: string, body: { name_en?: string; name_ar?: string; sort_order?: number }) =>
    api<{ category: AdminCategory }>(`/admin/menu/categories/${id}`, { method: 'PATCH', body }),
  deleteCategory: (id: string) =>
    api<{ ok: boolean }>(`/admin/menu/categories/${id}`, { method: 'DELETE' }),

  // Phase 2.3 — multi-campus
  listCampuses: (signal?: AbortSignal) =>
    api<{ campuses: Campus[] }>('/campuses', { signal, anonymous: true }),

  // ── Cup AI: per-product concierge attributes ─────────────────────────────
  getProductAttrs: (productId: string, signal?: AbortSignal) =>
    api<{ id: string; attrs: ConciergeAttrs }>(`/admin/menu/products/${productId}/attrs`, { signal }),
  setProductAttrs: (productId: string, body: Partial<ConciergeAttrs>) =>
    api<{ id: string; attrs: Partial<ConciergeAttrs> }>(`/admin/menu/products/${productId}/attrs`, { method: 'PATCH', body }),
  autoDetectAttrs: (productId: string) =>
    api<{ id: string; inferred: ConciergeAttrs }>(`/admin/menu/products/${productId}/auto-detect-attrs`, { method: 'POST' }),

  // Cup AI usage analytics
  getCupAiStats: (days = 7, signal?: AbortSignal) =>
    api<CupAiStatsResponse>(`/admin/reports/cup-ai?days=${days}`, { signal }),

  // Phase K6.1 / K6.3 — kiosk registry + heartbeat-driven health.
  listKiosks: (signal?: AbortSignal) =>
    api<{ kiosks: AdminKiosk[] }>('/admin/kiosks', { signal }),
  updateKiosk: (id: string, patch: { name?: string; active?: boolean }) =>
    api<{ kiosk: AdminKiosk }>(`/admin/kiosks/${id}`, {
      method: 'PATCH',
      body: patch,
    }),
};

export interface CupAiStatsResponse {
  days: number;
  windowMs: number;
  totalQueries: number;
  byLanguage: { en: number; ar: number };
  byConfidence: { low: number; medium: number; high: number };
  zeroMatchCount: number;
  topQueries: Array<{ query: string; count: number }>;
  topLowConfidenceQueries: Array<{ query: string; count: number }>;
  topSuggestedProductIds: Array<{ productId: string; count: number }>;
  topProducts: Array<{ productId: string; count: number; name_en: string; name_ar: string }>;
}

// ── Cup AI types (mirror api/services/concierge ConciergeAttrs) ────────────
export interface ConciergeAttrs {
  energy_level: 'low' | 'medium' | 'high' | null;
  sweetness: number | null;
  temperature: 'hot' | 'cold' | 'both' | null;
  caffeine_mg: number | null;
  tags_en: string[];
  tags_ar: string[];
}

/** Phase K6 — admin view of a registered kiosk. */
export interface AdminKiosk {
  id: string;
  name: string;
  active: boolean;
  /** ms since epoch. 0 means the row exists but has never heartbeat. */
  lastSeenAt: number;
  lastState:
    | 'attract'
    | 'browsing'
    | 'customizing'
    | 'checkout'
    | 'confirmation'
    | 'cleaning'
    | 'unknown';
  version: string | null;
  createdAt: number;
}
