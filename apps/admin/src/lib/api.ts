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

import type { OrderStatus } from '@cup-and-co/types';

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

// Phase R.3 — recovered reports shapes for the Reviews / Revenue Trend /
// Peak Hours sections that were lost in earlier merges.
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

// ── Reports v2 — Layer A types ─────────────────────────────────────────────
export interface AdminRevenueKpis {
  current: { revenue: number; orders: number; aov: number };
  prior: { revenue: number; orders: number; aov: number };
  delta: { revenue: number; orders: number; aov: number };
  window: { from: string; to: string; priorFrom: string; priorTo: string };
}

export interface AdminCustomersReport {
  newCustomers: number;
  returningCustomers: number;
  repeatRate: number;
  newRevenue: number;
  returningRevenue: number;
}

export interface AdminPaymentMixEntry {
  method: string;
  orders: number;
  revenue: number;
}

export interface AdminChannelMixEntry {
  channel: string;
  orders: number;
  revenue: number;
}

export interface AdminHeatmapReport {
  grid: number[][];
}

export interface AdminRefundsReport {
  totalOrders: number;
  cancelled: number;
  refunded: number;
  cancellationRate: number;
  refundRate: number;
  cancelledRevenue: number;
  refundedRevenue: number;
  reasons: Array<{ reason: string; count: number }>;
}

export interface AdminFunnelStage {
  stage: string;
  count: number;
}

export interface AdminFunnelDropoff {
  from: string;
  to: string;
  dropoff: number;
}

export interface AdminFunnelReport {
  stages: AdminFunnelStage[];
  dropoffs: AdminFunnelDropoff[];
  cancelled: number;
}

// ── Reports v2 — Layer B types ─────────────────────────────────────────────
export interface AdminPrepSlaMetric {
  p50: number;
  p95: number;
  avg: number;
  count: number;
}

export interface AdminPrepSlaReport {
  placedToAccepted: AdminPrepSlaMetric;
  acceptedToReady: AdminPrepSlaMetric;
  placedToCompleted: AdminPrepSlaMetric;
}

export interface AdminKioskLeaderboardRow {
  kioskId: string;
  kioskName: string;
  orders: number;
  revenue: number;
  peakHour: number;
  hourCounts: number[];
}

export interface AdminSlowMover {
  name_en: string;
  count: number;
  revenue: number;
}

export interface AdminProductPair {
  productA: string;
  productB: string;
  count: number;
}

export interface AdminOfferPerformance {
  totalDiscountedOrders: number;
  totalDiscountAmount: number;
  totalRevenueWithDiscount: number;
  offers: Array<{
    id: string;
    name_en: string;
    type: string;
    value: number;
    usageCount: number;
    usageLimit: number | null;
    active: boolean;
  }>;
}

export interface AdminLoyaltyMetrics {
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  totalCurrentBalance: number;
  redemptionRate: number;
  tierDistribution: Record<string, number>;
  revenueFromRedemptions: number;
  usersWithPoints: number;
}

export interface AdminDrillDownOrder {
  id: string;
  createdAt: string;
  totalEgp: number;
  status: string;
  paymentMethod: string;
  placementSource: string;
  itemCount: number;
  userId: string;
}

// ── Reports v2 — Layer C types ─────────────────────────────────────────────
export interface AdminCohortRow {
  week: string;
  size: number;
  retention: number[];
}

export interface AdminClvReport {
  totalCustomers: number;
  median: number;
  avg: number;
  p75: number;
  p90: number;
  buckets: Array<{ label: string; count: number }>;
  topCustomers: Array<{ userId: string; revenue: number; orders: number; firstOrder: string }>;
}

export interface AdminReferralFunnel {
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalPointsAwarded: number;
  revenueFromReferred: number;
  conversionRate: number;
  topReferrers: Array<{ userId: string; conversions: number; points: number }>;
}

export interface AdminForecastDay {
  date: string;
  predicted: number;
  dow: number;
}

export interface AdminForecastReport {
  forecast: AdminForecastDay[];
  totalForecast: number;
  trendFactor: number;
  dowAvg: number[];
}

export interface AdminAnomaly {
  date: string;
  revenue: number;
  expected: number;
  deviation: number;
  type: 'spike' | 'dip';
}

export interface AdminAnomalyReport {
  anomalies: AdminAnomaly[];
  today: { revenue: number; expected: number; deviation: number };
  threshold: number;
}

// ── Layer D types ─────────────────────────────────────────────────────────────
export interface AdminComparisonPeriod {
  from: string;
  to: string;
  revenue: number;
  orders: number;
  customers: number;
  items: number;
  aov: number;
}

export interface AdminComparisonReport {
  period1: AdminComparisonPeriod;
  period2: AdminComparisonPeriod;
  delta: { revenue: number; orders: number; customers: number; aov: number };
}

export interface AdminTarget {
  month: string;
  revenueTarget: number;
  ordersTarget: number;
  note: string;
}

export interface AdminAnnotation {
  id: string;
  date: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface AdminSavedView {
  id: string;
  name: string;
  preset: string;
  from?: string;
  to?: string;
  createdAt: string;
}

export interface AdminPulseReport {
  today: { revenue: number; orders: number };
  yesterday: { revenue: number; orders: number };
  week: { revenue: number; orders: number };
  pendingOrders: number;
  monthProgress: { target: number; actual: number; pct: number } | null;
}

export interface AdminDigestConfig {
  enabled: boolean;
  recipients: string[];
  dayOfWeek: number;
  hour: number;
}

export interface AdminDigestPreview {
  period: { from: string; to: string };
  summary: { revenue: number; orders: number; customers: number; aov: number };
  deltaVsLastWeek: { revenue: number; orders: number };
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  nextScheduled: string;
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
      {
        method: 'PATCH',
        body: { available },
      },
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
  // Phase 5 / R.3: Reports — `params` carries the optional date range filter
  // ("today" / "7d" / "30d" / "all" / "custom") added when restoring the lost
  // reports sections. Existing callers that pass nothing still get the
  // unfiltered / default-window response.
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
  // Phase R.3 — restored reports endpoints.
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

  // Coffee Pass — subscriptions summary
  getSubscriptionsSummary: (signal?: AbortSignal) =>
    api<AdminSubscriptionsSummary>('/admin/reports/subscriptions', { signal }),

  // Phase K6.1 / K6.3 — kiosk registry + heartbeat-driven health.
  listKiosks: (signal?: AbortSignal) =>
    api<{ kiosks: AdminKiosk[] }>('/admin/kiosks', { signal }),
  updateKiosk: (id: string, patch: { name?: string; active?: boolean }) =>
    api<{ kiosk: AdminKiosk }>(`/admin/kiosks/${id}`, {
      method: 'PATCH',
      body: patch,
    }),

  // Phase K6.4 — by-kiosk daily report.
  getKioskReport: (signal?: AbortSignal) =>
    api<AdminKioskReport>('/admin/reports/by-kiosk', { signal }),

  // ── Reports v2 — Layer A ─────────────────────────────────────────────────
  getRevenueKpis: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminRevenueKpis>(`/admin/reports/v2/revenue-kpis${qs ? `?${qs}` : ''}`, { signal });
  },
  getCustomersReport: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminCustomersReport>(`/admin/reports/v2/customers${qs ? `?${qs}` : ''}`, { signal });
  },
  getPaymentMix: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<{ breakdown: AdminPaymentMixEntry[]; total: number }>(`/admin/reports/v2/payment-mix${qs ? `?${qs}` : ''}`, { signal });
  },
  getChannelMix: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<{ breakdown: AdminChannelMixEntry[]; total: number }>(`/admin/reports/v2/channel-mix${qs ? `?${qs}` : ''}`, { signal });
  },
  getHeatmap: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminHeatmapReport>(`/admin/reports/v2/heatmap${qs ? `?${qs}` : ''}`, { signal });
  },
  getRefundsReport: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminRefundsReport>(`/admin/reports/v2/refunds${qs ? `?${qs}` : ''}`, { signal });
  },
  getFunnelReport: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminFunnelReport>(`/admin/reports/v2/funnel${qs ? `?${qs}` : ''}`, { signal });
  },

  // ── Reports v2 — Layer B ─────────────────────────────────────────────────
  getPrepSla: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminPrepSlaReport>(`/admin/reports/v2/prep-sla${qs ? `?${qs}` : ''}`, { signal });
  },
  getKioskLeaderboard: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<{ rows: AdminKioskLeaderboardRow[] }>(`/admin/reports/v2/kiosk-leaderboard${qs ? `?${qs}` : ''}`, { signal });
  },
  getSlowMovers: (params?: { from?: string; to?: string; limit?: number }, signal?: AbortSignal) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]);
    const qs = entries.length ? new URLSearchParams(entries).toString() : '';
    return api<{ products: AdminSlowMover[] }>(`/admin/reports/v2/slow-movers${qs ? `?${qs}` : ''}`, { signal });
  },
  getProductAttach: (params?: { from?: string; to?: string; limit?: number }, signal?: AbortSignal) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]);
    const qs = entries.length ? new URLSearchParams(entries).toString() : '';
    return api<{ pairs: AdminProductPair[] }>(`/admin/reports/v2/product-attach${qs ? `?${qs}` : ''}`, { signal });
  },
  getOfferPerformance: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return api<AdminOfferPerformance>(`/admin/reports/v2/offer-performance${qs ? `?${qs}` : ''}`, { signal });
  },
  getLoyaltyMetrics: (signal?: AbortSignal) =>
    api<AdminLoyaltyMetrics>('/admin/reports/v2/loyalty-metrics', { signal }),
  getDrillDown: (params: { date?: string; status?: string; channel?: string; payment?: string; limit?: number }, signal?: AbortSignal) => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]);
    const qs = entries.length ? new URLSearchParams(entries).toString() : '';
    return api<{ orders: AdminDrillDownOrder[]; total: number }>(`/admin/reports/v2/drill-down${qs ? `?${qs}` : ''}`, { signal });
  },

  // ── Reports v2 — Layer C ─────────────────────────────────────────────────
  getCohortRetention: (weeks?: number, signal?: AbortSignal) =>
    api<{ cohorts: AdminCohortRow[]; weeksBack: number }>(`/admin/reports/v2/cohort-retention${weeks ? `?weeks=${weeks}` : ''}`, { signal }),
  getClv: (signal?: AbortSignal) =>
    api<AdminClvReport>('/admin/reports/v2/clv', { signal }),
  getReferralFunnel: (signal?: AbortSignal) =>
    api<AdminReferralFunnel>('/admin/reports/v2/referral-funnel', { signal }),
  getForecast: (signal?: AbortSignal) =>
    api<AdminForecastReport>('/admin/reports/v2/forecast', { signal }),
  getAnomalies: (params?: { days?: number; threshold?: number }, signal?: AbortSignal) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]);
    const qs = entries.length ? new URLSearchParams(entries).toString() : '';
    return api<AdminAnomalyReport>(`/admin/reports/v2/anomalies${qs ? `?${qs}` : ''}`, { signal });
  },

  // ── Reports v2 — Layer D (self-serve) ───────────────────────────────────────
  getComparison: (from1: string, to1: string, from2: string, to2: string, signal?: AbortSignal) =>
    api<AdminComparisonReport>(`/admin/reports/v2/compare?from1=${from1}&to1=${to1}&from2=${from2}&to2=${to2}`, { signal }),
  getTargets: (signal?: AbortSignal) =>
    api<{ targets: AdminTarget[] }>('/admin/reports/v2/targets', { signal }),
  setTarget: (month: string, data: { revenueTarget: number; ordersTarget: number; note?: string }) =>
    api<AdminTarget>(`/admin/reports/v2/targets/${month}`, { method: 'PUT', body: data }),
  getAnnotations: (params?: { from?: string; to?: string }, signal?: AbortSignal) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v).map(([k, v]) => [k, String(v)]);
    const qs = entries.length ? new URLSearchParams(entries).toString() : '';
    return api<{ annotations: AdminAnnotation[] }>(`/admin/reports/v2/annotations${qs ? `?${qs}` : ''}`, { signal });
  },
  createAnnotation: (date: string, text: string) =>
    api<AdminAnnotation>('/admin/reports/v2/annotations', { method: 'POST', body: { date, text } }),
  deleteAnnotation: (id: string) =>
    api<{ ok: boolean }>(`/admin/reports/v2/annotations/${id}`, { method: 'DELETE' }),
  getSavedViews: (signal?: AbortSignal) =>
    api<{ views: AdminSavedView[] }>('/admin/reports/v2/saved-views', { signal }),
  createSavedView: (name: string, preset: string, from?: string, to?: string) =>
    api<AdminSavedView>('/admin/reports/v2/saved-views', { method: 'POST', body: { name, preset, from, to } }),
  deleteSavedView: (id: string) =>
    api<{ ok: boolean }>(`/admin/reports/v2/saved-views/${id}`, { method: 'DELETE' }),
  getPulse: (signal?: AbortSignal) =>
    api<AdminPulseReport>('/admin/reports/v2/pulse', { signal }),
  getDigestConfig: (signal?: AbortSignal) =>
    api<AdminDigestConfig>('/admin/reports/v2/digest/config', { signal }),
  setDigestConfig: (config: AdminDigestConfig) =>
    api<AdminDigestConfig>('/admin/reports/v2/digest/config', { method: 'PUT', body: config }),
  getDigestPreview: (signal?: AbortSignal) =>
    api<AdminDigestPreview>('/admin/reports/v2/digest/preview', { signal }),
  exportCsv: async (section: string, from?: string, to?: string) => {
    const params = new URLSearchParams({ section });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const url = `${BASE_URL}/admin/reports/v2/export/csv?${params.toString()}`;
    const res = await fetch(url, { headers: buildAuthHeaders(), cache: 'no-store' });
    if (res.status === 204) return null;
    if (!res.ok) throw new ApiError(`Export failed (${res.status})`, res.status, null);
    const blob = await res.blob();
    const filename = `${section}-${from ?? 'all'}-${to ?? 'all'}.csv`;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
    return filename;
  },
};

// ── Cup AI types ───────────────────────────────────────────────────────────
export interface ConciergeAttrs {
  energy_level: 'low' | 'medium' | 'high' | null;
  sweetness: number | null;
  temperature: 'hot' | 'cold' | 'both' | null;
  caffeine_mg: number | null;
  tags_en: string[];
  tags_ar: string[];
}

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

/** Coffee Pass — admin subscriptions summary shape. */
export interface AdminSubscriptionsSummary {
  activeCount: number;
  cancelledCount: number;
  /** Locked-in MRR for the rest of this billing cycle, in EGP. */
  monthlyRevenueEgp: number;
  totalPlans: number;
}

/** Phase K6.4 — by-kiosk daily report shape. */
export interface AdminKioskReport {
  rows: Array<{
    kiosk: {
      id: string;
      name: string;
      active: boolean;
      lastSeenAt: number;
      lastState: AdminKiosk['lastState'];
    };
    today: {
      orderCount: number;
      revenueEgp: number;
      topItems: { name_en: string; name_ar: string; count: number }[];
      /** Phase K7.3 — today's thumbs-up / thumbs-down tallies. */
      ratings: { up: number; down: number };
    };
  }>;
  /** YYYY-MM-DD in server's UTC clock. */
  dateIso: string;
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
