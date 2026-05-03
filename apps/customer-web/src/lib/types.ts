/**
 * Re-export domain types from the shared workspace package so app code can
 * import everything from `@/lib/types` without reaching across packages.
 */
export type {
  User,
  UserRole,
  VerificationStatus,
  Category,
  Product,
  ProductOption,
  Offer,
  KioskStatus,
  Review,
  CatalogResponse,
  ProductDetailResponse,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  LoyaltySource,
  Favorite,
} from '@cup-and-co/types';

/**
 * Shape returned by the API's `/auth/otp/verify` endpoint. The API stub
 * issues a plain JWT plus a slimmer user view than the full `User` type
 * (no `full_name`, `language_pref`, etc. yet) so we model it explicitly.
 */
export interface SessionUser {
  id: string;
  phone: string;
  role: 'student' | 'faculty' | 'office' | 'owner' | 'barista';
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'blocked';
  phoneVerified: boolean;
  /** Optional client-side metadata only — not persisted server-side yet. */
  fullName?: string | null;
  /** Preferred display language. Defaults to `'en'`. */
  languagePref?: 'en' | 'ar';
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
}

export interface OtpSendResponse {
  ok: boolean;
  phone: string;
  devCode?: string;
  message: string;
}

export interface MeResponse {
  user: SessionUser;
  points: number;
}
