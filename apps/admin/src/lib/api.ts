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
  return {
    'x-user-id': session.userId,
    'x-user-role': session.role,
    'x-user-phone': session.phone,
    'x-verification-status': 'approved',
  };
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
};
