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
  createOrder: (input: CreateOrderRequest) =>
    apiFetch<OrderResponse>('/orders', { method: 'POST', body: input }),

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

  getFavorites: () =>
    apiFetch<{ productIds: string[] }>('/favorites'),

  addFavorite: (productId: string) =>
    apiFetch<{ ok: boolean }>(`/favorites/${productId}`, { method: 'POST' }),

  removeFavorite: (productId: string) =>
    apiFetch<{ ok: boolean }>(`/favorites/${productId}`, { method: 'DELETE' }),

  // -- Phase 4 game endpoints --
  createGameSession: () =>
    apiFetch<GameSession>('/games/sessions', { method: 'POST' }),

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
};
