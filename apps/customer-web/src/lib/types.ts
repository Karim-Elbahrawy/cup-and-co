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
