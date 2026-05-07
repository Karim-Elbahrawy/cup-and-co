export type UserRole = 'student' | 'faculty' | 'office' | 'owner' | 'barista';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

export type FulfillmentType = 'pickup' | 'delivery';

export type OrderStatus =
  | 'received'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod = 'paymob_card' | 'paymob_wallet' | 'cash';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export type LoyaltySource = 'online_paid' | 'cash_in_app' | 'qr_receipt' | 'game_reward';

export type OptionGroup = 'shots' | 'size' | 'sugar' | 'ice' | 'milk' | 'extras';

export interface User {
  id: string;
  phone: string;
  full_name: string | null;
  role: UserRole;
  verification_status: VerificationStatus;
  university_id: string | null;
  major: string | null;
  department: string | null;
  language_pref: 'en' | 'ar';
  biometric_enabled: boolean;
  blocked: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  base_price_egp: number;
  image_url: string;
  prep_minutes: number;
  is_available: boolean;
  sort_order: number;
  rating_avg: number;
  rating_count: number;
  /** null = unlimited stock; 0 = out of stock; >0 = units remaining */
  stock_count: number | null;
  /**
   * Phase 3.4 — Cloudflare Images ID. When set, customer-web builds the
   * CDN URL via `cdnImage()` (with on-the-fly resize variants); when
   * null, falls back to `image_url`.
   */
  image_id?: string | null;
  /**
   * Phase 3.2 — staff-managed out-of-stock toggle that complements
   * `stock_count`. `is_out_of_stock` overrides display regardless of
   * count. `out_of_stock_until` auto-clears the flag at that timestamp
   * via a cron job.
   */
  is_out_of_stock?: boolean;
  out_of_stock_until?: string | null;
}

export interface ProductOption {
  id: string;
  product_id: string;
  group_name: OptionGroup;
  name_en: string;
  name_ar: string;
  price_delta_egp: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  fulfillment_type: FulfillmentType;
  scheduled_for: string | null;
  subtotal_egp: number;
  discount_egp: number;
  points_redeemed: number;
  total_egp: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  pickup_code: string | null;
  created_at: string;
  picked_up_at: string | null;
  notes: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  options: Record<string, string>;
  line_total_egp: number;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: string;
  provider_intent_id: string | null;
  amount_egp: number;
  status: PaymentStatus;
  raw_callback: Record<string, unknown> | null;
  verified_at: string | null;
  created_at: string;
}

export interface LoyaltyPoint {
  id: string;
  user_id: string;
  source: LoyaltySource;
  order_id: string | null;
  qr_code_id: string | null;
  points: number;
  balance_after: number;
  created_at: string;
}

export interface QrReceipt {
  id: string;
  order_id: string | null;
  code: string;
  points_value: number;
  used_at: string | null;
  used_by_user_id: string | null;
  expires_at: string;
}

export interface Offer {
  id: string;
  name_en: string;
  name_ar: string;
  type: 'percentage' | 'fixed' | 'free_item';
  value: number;
  starts_at: string;
  ends_at: string;
  target_roles: UserRole[];
  code: string | null;
  usage_limit: number | null;
  usage_count: number;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  score: number | null;
  server_max_score: number;
  validated: boolean;
}

export interface LeaderboardWeek {
  id: string;
  week_start: string;
  week_end: string;
  prize_rules: PrizeRule[];
  settled_at: string | null;
}

export interface PrizeRule {
  rank: number;
  type: 'free_combo' | 'free_drink' | 'percentage_off';
  value: number;
  description_en: string;
  description_ar: string;
}

export interface Prize {
  id: string;
  user_id: string;
  week_id: string;
  rank: number;
  type: string;
  code: string;
  redeemed_at: string | null;
  expires_at: string;
}

export interface KioskStatus {
  id: string;
  is_open: boolean;
  message_en: string | null;
  message_ar: string | null;
  capacity_per_slot: number;
  slot_minutes: number;
  opens_at: string;
  closes_at: string;
}

export interface PushDevice {
  id: string;
  user_id: string;
  platform: 'ios' | 'web';
  token: string;
  last_seen_at: string;
}

export interface CatalogResponse {
  categories: Category[];
  products: Product[];
  offers: Offer[];
  kiosk: KioskStatus;
}

/**
 * Controls what the customer sees on the product detail page.
 * - `full`      – stars, review list, and write-review form are all shown (default).
 * - `view_only` – stars and the review list are shown; the write-review form is hidden.
 * - `hidden`    – nothing review-related is shown (no stars, no list, no form).
 */
export type ReviewMode = 'full' | 'write_only' | 'hidden';

export interface ProductDetailResponse {
  product: Product;
  options: ProductOption[];
  reviews: Review[];
  is_favorited: boolean;
  review_mode: ReviewMode;
}

export interface LoyaltyResponse {
  balance: number;
  history: LoyaltyPoint[];
}

export interface LeaderboardResponse {
  week: LeaderboardWeek;
  entries: { user_id: string; name: string; score: number; rank: number }[];
  my_rank: number | null;
  my_score: number | null;
}

// Phase 2.1 of UPGRADE-PLAN.md — multi-campus types.
export interface Campus {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  timezone: string;
  currency: string;
  default_language: 'en' | 'ar';
  is_active: boolean;
  created_at: string;
}

export interface Kiosk {
  id: string;
  campus_id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  building: string | null;
  lat: number | null;
  lng: number | null;
  is_open: boolean;
  is_active: boolean;
  message_en: string | null;
  message_ar: string | null;
  capacity_per_slot: number;
  slot_minutes: number;
  opens_at: string; // 'HH:MM' or 'HH:MM:SS'
  closes_at: string;
}

export interface CampusListResponse {
  campuses: Campus[];
}

export interface CampusKiosksResponse {
  campus: Campus;
  kiosks: Kiosk[];
}
