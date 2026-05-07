import { getToken } from './session';
import type {
  AuthResponse,
  CatalogResponse,
  CreateOrderRequest,
  GameScoreResponse,
  GameSession,
  LeaderboardCurrentResponse,
  LeaderboardMeResponse,
  LoyaltyHistoryResponse,
  LoyaltyResponse,
  MeResponse,
  OrderResponse,
  OrdersListResponse,
  OtpSendResponse,
  PaymobIntentionResponse,
  PrizesResponse,
  ProductDetailResponse,
  ReviewInput,
  ReviewResponse,
} from './types';
import type { Campus, Kiosk } from '@cup-and-co/types';

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip auth header even if a token exists. Used for OTP endpoints. */
  noAuth?: boolean;
}

/**
 * Thin fetch wrapper. Adds the JSON content type, attaches the bearer token
 * from the session store (unless `noAuth` is set), and unwraps the JSON
 * response — throwing `ApiError` on non-2xx responses.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, noAuth, headers, ...rest } = options;
  const token = noAuth ? null : getToken();

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content
  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : null) ?? `Request failed with ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

// ---- Typed endpoint helpers --------------------------------------------------

export const api = {
  health: () => apiFetch<{ ok: boolean; service: string; time: string }>('/health'),

  sendOtp: (phone: string) =>
    apiFetch<OtpSendResponse>('/auth/otp/send', {
      method: 'POST',
      body: { phone },
      noAuth: true,
    }),

  verifyOtp: (phone: string, code: string) =>
    apiFetch<AuthResponse>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code },
      noAuth: true,
    }),

  me: () => apiFetch<MeResponse>('/me'),

  patchMe: (input: {
    full_name?: string;
    role?: string;
    language_pref?: string;
    biometric_enabled?: boolean;
    university_id?: string;
    major?: string;
    department?: string;
    gender?: string;
    avatar_id?: number;
  }) => apiFetch<MeResponse>('/me', { method: 'PATCH', body: input }),

  catalog: () => apiFetch<CatalogResponse>('/catalog'),

  product: (id: string) => apiFetch<ProductDetailResponse>(`/products/${id}`),

  // -- Phase 2 ordering --
  createOrder: (input: CreateOrderRequest, idempotencyKey?: string) =>
    apiFetch<OrderResponse>('/orders', {
      method: 'POST',
      body: input,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),

  getOrder: (id: string) => apiFetch<OrderResponse>(`/orders/${id}`),

  listOrders: () => apiFetch<OrdersListResponse>('/orders'),

  paymobIntention: (orderId: string, method: 'paymob_card' | 'paymob_wallet') =>
    apiFetch<PaymobIntentionResponse>('/payments/paymob/intention', {
      method: 'POST',
      body: { orderId, method },
    }),

  loyalty: () => apiFetch<LoyaltyResponse>('/loyalty'),

  // -- Phase 3 rewards / reviews / favorites --
  loyaltyHistory: () => apiFetch<LoyaltyHistoryResponse>('/loyalty'),

  redeemQr: (code: string) =>
    apiFetch<{ pointsAwarded: number }>('/loyalty/redeem-qr', {
      method: 'POST',
      body: { code },
    }),

  cancelOrder: (id: string) =>
    apiFetch<OrderResponse>(`/orders/${id}/cancel`, { method: 'POST' }),

  submitReview: (input: ReviewInput) =>
    apiFetch<ReviewResponse>('/reviews', { method: 'POST', body: input }),

  addFavorite: (productId: string) =>
    apiFetch<{ ok: boolean }>(`/favorites/${productId}`, { method: 'POST' }),

  removeFavorite: (productId: string) =>
    apiFetch<{ ok: boolean }>(`/favorites/${productId}`, { method: 'DELETE' }),

  // -- Phase 4 game endpoints --
  createGameSession: () =>
    apiFetch<GameSession>('/games/sessions', { method: 'POST' }),

  gameDailyStatus: () =>
    apiFetch<{ sessionsUsed: number; sessionsLeft: number; dailyLimit: number }>('/games/sessions/me'),

  submitGameScore: (sessionId: string, score: number, durationSeconds: number) =>
    apiFetch<GameScoreResponse>('/games/scores', {
      method: 'POST',
      body: { sessionId, score, durationSeconds },
    }),

  leaderboardCurrent: () =>
    apiFetch<LeaderboardCurrentResponse>('/leaderboard/current'),

  leaderboardMe: () =>
    apiFetch<LeaderboardMeResponse>('/leaderboard/me'),

  prizes: () =>
    apiFetch<PrizesResponse>('/prizes'),

  validateCoupon: (code: string) =>
    apiFetch<{ ok: boolean; type?: string; value?: number; descriptionEn?: string; descriptionAr?: string; reason?: string }>('/coupons/validate', {
      method: 'POST',
      body: { code },
    }),

  searchProducts: (q: string) =>
    apiFetch<CatalogResponse>(`/catalog?q=${encodeURIComponent(q)}`),

  // -- Phase 1.3 account lifecycle / data export --
  accountStatus: () =>
    apiFetch<{
      status: 'active' | 'deletion_requested' | 'deletion_pending';
      deletionRequestedAt?: string;
      deletedAt?: string | null;
      graceUntil?: string;
      graceDays?: number;
    }>('/me/account/status'),

  requestAccountDeletion: () =>
    apiFetch<{ ok: boolean; expiresAt: string; devCode?: string }>(
      '/me/account/delete-request',
      { method: 'POST' },
    ),

  confirmAccountDeletion: (code: string) =>
    apiFetch<{
      ok: boolean;
      deletedAt: string;
      deletionRequestedAt: string;
      graceUntil: string;
      graceDays: number;
      message: string;
    }>('/me/account/delete-confirm', { method: 'POST', body: { code } }),

  cancelAccountDeletion: () =>
    apiFetch<{ ok: boolean; message: string }>(
      '/me/account/cancel-deletion',
      { method: 'POST' },
    ),

  requestDataExport: () =>
    apiFetch<{
      jobId: string;
      status: 'pending' | 'running' | 'done' | 'failed';
      downloadUrl: string;
      expiresAt: string | null;
    }>('/me/data/export', { method: 'POST' }),

  getDataExport: (jobId: string) =>
    apiFetch<{
      jobId: string;
      status: 'pending' | 'running' | 'done' | 'failed';
      createdAt: string;
      doneAt: string | null;
      expiresAt: string | null;
      error: string | null;
      downloadUrl?: string;
    }>(`/me/data/exports/${jobId}`),

  // -- Phase 2.2 multi-campus --
  listCampuses: () => apiFetch<{ campuses: Campus[] }>('/campuses'),

  getCampus: (id: string) =>
    apiFetch<{ campus: Campus; kiosks: Kiosk[] }>(`/campuses/${id}`),

  myCampus: () => apiFetch<{ campus: Campus | null }>('/me/campus'),

  setMyCampus: (campusId: string) =>
    apiFetch<{ campus: Campus }>('/me/campus', {
      method: 'PATCH',
      body: { campus_id: campusId },
    }),

  // -- Phase 6.1 order favorites (separate from product `addFavorite`) --
  listOrderFavorites: () => apiFetch<{ favorites: OrderFavorite[] }>('/me/favorites/orders'),

  createOrderFavorite: (input: {
    name: string;
    items: OrderFavoriteItem[];
    timeOfDay?: 'morning' | 'midday' | 'evening' | null;
    isDefault?: boolean;
  }) =>
    apiFetch<{ favorite: OrderFavorite }>('/me/favorites/orders', {
      method: 'POST',
      body: input,
    }),

  updateOrderFavorite: (
    id: string,
    input: Partial<{
      name: string;
      items: OrderFavoriteItem[];
      timeOfDay: 'morning' | 'midday' | 'evening' | null;
      isDefault: boolean;
    }>,
  ) =>
    apiFetch<{ favorite: OrderFavorite }>(`/me/favorites/orders/${id}`, {
      method: 'PATCH',
      body: input,
    }),

  deleteOrderFavorite: (id: string) =>
    apiFetch<{ ok: boolean }>(`/me/favorites/orders/${id}`, { method: 'DELETE' }),

  reorderOrderFavorite: (id: string) =>
    apiFetch<{ items: OrderFavoriteItem[]; favoriteId: string; favoriteName: string }>(
      `/me/favorites/orders/${id}/reorder`,
      { method: 'POST' },
    ),

  // -- Phase 6.2 streaks --
  myStreak: () => apiFetch<{ streak: StreakState }>('/me/streak'),
};

// Phase 6.1 types — kept inline so callers can import alongside `api`.
export interface OrderFavoriteItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  imageUrl: string;
  quantity: number;
  options: Record<string, string>;
  unitPriceEgp: number;
}

export interface OrderFavorite {
  id: string;
  userId: string;
  name: string;
  items: OrderFavoriteItem[];
  timeOfDay: 'morning' | 'midday' | 'evening' | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Phase 6.2 streak state.
export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastOrderDate: string | null;
  freezesUsedThisWeek: number;
  freezesResetAt: string;
  lastBonusStreak: number;
  createdAt: string;
  updatedAt: string;
}
