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
  ReviewMode,
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
  /** Optional avatar image URL for profile rendering. */
  avatarUrl?: string | null;
  /** Preferred display language. Defaults to `'en'`. */
  languagePref?: 'en' | 'ar';
  /** Personality avatar index 1–7 chosen during profile setup. */
  avatarId?: number | null;
  /** Gender selected during profile setup. */
  gender?: 'male' | 'female' | 'prefer_not_to_say' | null;
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

// -- Phase 2 ordering types (mirror apps/api/src/services/orders.ts) ----------

export interface ApiOrderItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  imageUrl: string;
  quantity: number;
  options: Record<string, string>;
  unitPriceEgp: number;
  lineTotalEgp: number;
}

export interface ApiStatusEvent {
  status: import('@cup-and-co/types').OrderStatus;
  at: string;
  note?: string;
}

export interface ApiOrder {
  id: string;
  userId: string;
  status: import('@cup-and-co/types').OrderStatus;
  fulfillmentType: 'pickup' | 'delivery';
  paymentMethod: 'paymob_card' | 'paymob_wallet' | 'cash';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  subtotalEgp: number;
  discountEgp: number;
  pointsRedeemed: number;
  totalEgp: number;
  pointsAwarded: number;
  pickupCode: string | null;
  scheduledFor: string | null;
  notes: string | null;
  items: ApiOrderItem[];
  statusHistory: ApiStatusEvent[];
  createdAt: string;
  pickedUpAt: string | null;
}

export interface TimelineStep {
  status: import('@cup-and-co/types').OrderStatus;
  label: string;
  at: string | null;
  active: boolean;
  done: boolean;
}

export interface OrderResponse {
  order: ApiOrder;
  timeline: TimelineStep[];
}

export interface OrdersListResponse {
  orders: ApiOrder[];
}

export interface CreateOrderRequest {
  fulfillmentType: 'pickup' | 'delivery';
  paymentMethod: 'paymob_card' | 'paymob_wallet' | 'cash';
  scheduledFor?: string | null;
  redeemPoints: number;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    options: Record<string, string>;
  }>;
}

export interface PaymobIntentionResponse {
  orderId: string;
  userId: string;
  amountEgp: number;
  status: 'pending';
  gateway: 'paymob';
  gatewayReference: string;
  checkoutUrl: string;
  iframeId: string;
}

export interface LoyaltyResponse {
  balance: number;
  discountAvailableEgp: number;
}

// -- Phase 3 types -----------------------------------------------------------

export interface LoyaltyEntry {
  id: string;
  source: string;
  orderId: string | null;
  points: number;
  balanceAfter: number;
  createdAt: string;
}

export interface LoyaltyHistoryResponse {
  balance: number;
  discountAvailableEgp: number;
  history: LoyaltyEntry[];
}

export interface ReviewInput {
  productId: string;
  orderId?: string | null;
  rating: number;
  comment: string;
}

export interface ReviewResponse {
  id: string;
  userId: string;
  productId: string;
  orderId: string | null;
  rating: number;
  comment: string;
  hidden: boolean;
  createdAt: string;
}

// -- Phase 4 game types -------------------------------------------------------

export interface GameSession {
  id: string;
  serverMaxScore: number;
  startedAt: string;
  weekKey: string;
}

export interface GameScoreResponse {
  accepted: boolean;
  pointsAwarded: number;
  weekKey: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  totalScore: number;
  weekKey: string;
}

export interface LeaderboardCurrentResponse {
  entries: LeaderboardEntry[];
}

export interface LeaderboardMeResponse {
  rank: number;
  totalScore: number;
  weekKey: string;
}

export interface Prize {
  id: string;
  rank: number;
  type: string;
  description: string;
  code: string;
  redeemedAt: string | null;
  expiresAt: string;
}

export interface PrizesResponse {
  prizes: Prize[];
}
