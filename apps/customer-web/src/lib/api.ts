import { getToken } from './session';
import type {
  AuthResponse,
  CatalogResponse,
  MeResponse,
  OtpSendResponse,
  ProductDetailResponse,
} from './types';

const BASE_URL =
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

  catalog: () => apiFetch<CatalogResponse>('/catalog'),

  product: (id: string) => apiFetch<ProductDetailResponse>(`/products/${id}`),
};
