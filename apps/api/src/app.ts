import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { errorHandler } from './http/errors.js';
import { track as trackAnalytics } from './services/analytics.js';
import { config } from './config.js';
import { requireAuth, requireAdmin, getRequestUser, getAdminRole, signSession } from './http/auth.js';
import { assertAdminPermission } from './services/permissions.js';
import { calculateDiscountEgp, calculateEarnedPoints } from './services/loyalty.js';
import { createQrReceiptService } from './services/qrReceipts.js';
import { createGameService } from './services/games.js';
import { createPaymobService } from './services/payments.js';
import {
  applyStatusTransition,
  buildOrder,
  trackingTimelineFor,
  type Order,
} from './services/orders.js';
import { computePrepEta, type PrepEta } from './services/prepEta.js';
import { createPushService, statusNotificationCopy } from './services/push.js';
import {
  issueDeleteOtp,
  verifyDeleteOtp,
  markDeletionConfirmed,
  cancelDeletion,
  getDeletionState,
  isAccountDeleted,
  deletionGraceUntil,
  ACCOUNT_GRACE_DAYS,
  canRequestExport,
  createExportJob,
  completeExportJob,
  getExportJob,
  type ExportJob,
} from './services/accountLifecycle.js';
import {
  listOrderFavorites,
  getOrderFavorite,
  createOrderFavorite,
  updateOrderFavorite,
  deleteOrderFavorite,
  type TimeOfDay,
} from './db/orderFavoritesRepo.js';
import { getStreakState, recordOrderForStreak } from './db/streakRepo.js';
import {
  applyTierMultiplier,
  recalculateOnEarn,
  getTierState,
  getTierHistory,
  TIER_BENEFITS,
  TIER_THRESHOLDS_OUT,
  type LoyaltyTier,
} from './services/tierEngine.js';
import { suggestForUser } from './services/suggestionEngine.js';
import { getCatalog } from './db/catalogRepo.js';
import {
  ensureReferralCode,
  trackReferralClick,
  linkRefereeOnSignup,
  tryConvertReferralOnFirstPaidOrder,
  listReferralsByReferrer,
  getReferralStats,
  REFERRER_REWARD,
  REFEREE_REWARD,
  MIN_CONVERSION_ORDER_EGP,
} from './db/referralRepo.js';
import { evaluateAllFlags } from './services/featureFlags.js';
import { catalogRouter } from './routes/catalog.js';
import {
  listCampuses,
  getCampus,
  listKiosksForCampus,
  getDefaultCampusId,
  isValidCampusId,
} from './db/campusRepo.js';
import {
  getProductDetail,
  addProduct,
  updateExtraProduct,
  deleteExtraProduct,
  isExtraProduct,
  setProductReviewMode,
  // Legacy numeric stock_count API (Phase 3.2 stage-1).
  getProductStock as getProductStockCount,
  setProductStock as setProductStockCount,
} from './db/catalogRepo.js';
import {
  // New staff-toggle out-of-stock API (Phase 3.2 stage-2).
  isProductOutOfStock,
  getProductStock,
  setProductStock,
} from './db/productStockRepo.js';
import { adminOffers } from './db/offersStore.js';
import { setFeatured as setFeaturedProduct } from './db/featuredProductsStore.js';
import { setPairs as setProductPairs } from './db/productPairsStore.js';
import {
  recordHeartbeat as recordKioskHeartbeat,
  listKiosks,
  updateKiosk,
  type KioskState,
} from './db/kiosksStore.js';

// In-memory demo store. Catalog reads come from `db/catalogRepo.ts` (Supabase
// if configured, fixture otherwise).
const orders = new Map<string, Order>();
const userPoints = new Map<string, number>();
const userProfiles = new Map<string, Record<string, unknown>>();
const pushDevices = new Map<string, Array<{ platform: 'ios' | 'web'; token: string; last_seen_at: string }>>();

// Phase 3: in-memory stores for reviews, favorites, loyalty history
const reviews = new Map<string, Array<{ id: string; userId: string; productId: string; orderId: string | null; rating: number; comment: string; hidden: boolean; createdAt: string }>>();
const favorites = new Map<string, Set<string>>();
const loyaltyHistory = new Map<string, Array<{ id: string; source: string; orderId: string | null; points: number; balanceAfter: number; createdAt: string }>>();

// Phase 5: users registry for admin user management, and mutable offers store
const usersRegistry = new Map<string, { id: string; phone: string; full_name: string | null; role: string; verification_status: string; blocked: boolean; created_at: string }>();

// Reverse-lookup: phone → userId (so returning users keep their data across verify calls)
const phoneToUserId = new Map<string, string>();

// OTP store: phone → { code, expiresAt }
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Phase 4: prizes store keyed by userId
interface Prize {
  id: string;
  userId: string;
  weekKey: string;
  rank: number;
  type: 'free_combo' | 'free_drink' | 'percentage_off';
  description: string;
  code: string;
  redeemedAt: string | null;
  expiresAt: string;
  createdAt: string;
}
const prizes = new Map<string, Prize[]>(); // userId → prizes[]
const settledWeeks = new Set<string>(); // weekKeys already settled

// SSE: order-level event bus for real-time updates
const orderEvents = new EventEmitter();
orderEvents.setMaxListeners(200);

// Admin-mutable kiosk state.
const kioskState = {
  is_open: true,
  message_en: 'We are open — your morning is handled' as string | null,
  message_ar: 'مفتوحون — صباحك معانا' as string | null,
  capacity_per_slot: 10,
  slot_minutes: 15,
  opens_at: '07:00',
  closes_at: '22:00',
};

// Admin-mutable per-product availability override. `productAvailability.get(id)`
// returns the boolean override; absent means "use catalog default".
const productAvailability = new Map<string, boolean>();

const qrReceipts = createQrReceiptService();
const games = createGameService();
const paymob = createPaymobService();
const pushService = createPushService();

// -------------- Schemas --------------

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(20),
  options: z.record(z.string()).default({}),
});

const createOrderSchema = z.object({
  fulfillmentType: z.enum(['pickup', 'delivery']),
  paymentMethod: z.enum(['paymob_card', 'paymob_wallet', 'cash']),
  scheduledFor: z.string().datetime().nullable().optional(),
  redeemPoints: z.number().int().nonnegative().default(0),
  notes: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1).max(20),
  // Phase K1.11 — channel that placed the order. Optional from clients;
  // POST /orders defaults missing values to 'customer_app' to keep the
  // existing customer-web/iOS clients backward-compatible without a
  // coordinated release.
  placementSource: z.enum(['customer_app', 'kiosk', 'admin_phone']).optional(),
  kioskId: z.string().uuid().nullable().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'received', 'accepted', 'preparing', 'ready',
    'out_for_delivery', 'completed', 'cancelled', 'refunded',
  ]),
  note: z.string().max(200).optional(),
});

const otpSendSchema = z.object({ phone: z.string().regex(/^\+?\d{8,15}$/) });
const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+?\d{8,15}$/),
  code: z.string().regex(/^\d{6}$/),
});

const paymobIntentionSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(['paymob_card', 'paymob_wallet']),
});

const paymobCallbackSchema = z.object({
  orderId: z.string().min(1),
  success: z.boolean(),
  transactionId: z.string().min(1),
  amountEgp: z.number().positive(),
});

const submitScoreSchema = z.object({
  sessionId: z.string().min(1),
  score: z.number().int().nonnegative(),
  durationSeconds: z.number().positive(),
});

// Account lifecycle (Phase 1.3 of UPGRADE-PLAN.md)
const deleteConfirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// -------------- Helpers --------------

// Maps internal loyalty source strings → PostHog `points_earned.source` enum.
// Sources not in this map (refund, redeemed) fire a different analytics event
// or none at all. Phase 1.2 of UPGRADE-PLAN.md.
const LOYALTY_SOURCE_TO_ANALYTICS: Record<string, 'order' | 'scan' | 'game' | 'referral'> = {
  online_paid: 'order',
  cash_in_app: 'order',
  qr_receipt: 'scan',
  game_reward: 'game',
  referral: 'referral',
};

function recordLoyaltyEvent(userId: string, source: string, points: number, orderId: string | null = null) {
  const balance = userPoints.get(userId) ?? 0;
  const history = loyaltyHistory.get(userId) ?? [];
  history.push({
    id: randomUUID(),
    source,
    orderId,
    points,
    balanceAfter: balance,
    createdAt: new Date().toISOString(),
  });
  loyaltyHistory.set(userId, history);

  // Mirror to PostHog. Earn vs redeem differentiated by sign + known source.
  const analyticsSource = LOYALTY_SOURCE_TO_ANALYTICS[source];
  if (points > 0 && analyticsSource) {
    trackAnalytics(userId, {
      name: 'points_earned',
      props: { source: analyticsSource, amount: points, new_balance: balance },
    });
  } else if (source === 'redeemed' && points < 0) {
    trackAnalytics(userId, {
      name: 'points_redeemed',
      props: { discount_amount: Math.abs(points), points_spent: Math.abs(points), new_balance: balance },
    });
  }
}

/**
 * Phase 6.3 — sum positive points entries from the last 365 days for
 * tier calculation. Closes over `loyaltyHistory` (in-memory). Production
 * reads from `loyalty_points` table directly.
 */
function getTrailing12mPoints(userId: string): number {
  const cutoffMs = Date.now() - 365 * 86_400_000;
  const history = loyaltyHistory.get(userId) ?? [];
  let total = 0;
  for (const entry of history) {
    if (entry.points <= 0) continue;
    if (new Date(entry.createdAt).getTime() < cutoffMs) continue;
    total += entry.points;
  }
  return total;
}

/**
 * Compute the prep ETA for an order using the current snapshot of all
 * active orders for queue-position lookups. Pure projection — does not
 * persist the value (it changes every time we look at it).
 */
function prepEtaFor(order: Order): PrepEta {
  return computePrepEta(order, Array.from(orders.values()));
}

function emitOrderUpdate(order: Order) {
  const payload = {
    order,
    timeline: trackingTimelineFor(order),
    prepEta: prepEtaFor(order),
  };
  orderEvents.emit(`order:${order.id}`, payload);
  orderEvents.emit('orders:all', payload);
}

async function notifyOrderStatus(order: Order, status: Parameters<typeof statusNotificationCopy>[0]['status']) {
  const profile = userProfiles.get(order.userId) ?? {};
  const language = (profile.language_pref === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  const devices = pushDevices.get(order.userId) ?? [];
  if (devices.length === 0) return;
  const payload = statusNotificationCopy({
    status,
    pickupCode: order.pickupCode,
    fulfillmentType: order.fulfillmentType,
    language,
  });
  await pushService.notify(devices, {
    ...payload,
    data: { order_id: order.id, status },
  });
}

// -------------- App --------------

export function createApp(): express.Express {
  const app = express();

  // Security hardening: Helmet headers (CSP off — API responses are JSON,
  // and CSP would only fire if a browser were misled into rendering them),
  // HSTS forced on, x-powered-by disabled.
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // honor X-Forwarded-* from a single hop (load balancer)
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }));

  app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-user-id', 'x-user-role', 'x-user-phone', 'x-verification-status', 'x-placement-source', 'x-kiosk-id', 'x-admin-campus-id'],
    exposedHeaders: ['ETag'],
    credentials: false,
    maxAge: 86400,
  }));

  // Simple sliding-window rate limiter for OTP endpoints (per source IP)
  const otpHits = new Map<string, number[]>();
  const OTP_WINDOW_MS = 60_000;
  const OTP_MAX = 5;
  function otpRateLimit(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const hits = (otpHits.get(ip) ?? []).filter((t) => now - t < OTP_WINDOW_MS);
    if (hits.length >= OTP_MAX) {
      res.status(429).json({ error: 'Too many OTP requests. Please wait before trying again.' });
      return;
    }
    hits.push(now);
    otpHits.set(ip, hits);
    next();
  }

  // Generic per-IP rate limit on every request — defends against accidental
  // floods. Skipped in tests so they can hammer endpoints. Production should
  // swap this for a Redis-backed limiter behind a load balancer.
  if (config.nodeEnv !== 'test') {
    const REQ_WINDOW_MS = 60_000;
    const REQ_MAX = 300; // 5 req/sec sustained
    const reqHits = new Map<string, number[]>();
    app.use((req, res, next) => {
      const ip = req.ip ?? 'unknown';
      const now = Date.now();
      const hits = (reqHits.get(ip) ?? []).filter((t) => now - t < REQ_WINDOW_MS);
      if (hits.length >= REQ_MAX) {
        res.status(429).json({ error: 'Too many requests. Please slow down.' });
        return;
      }
      hits.push(now);
      reqHits.set(ip, hits);
      next();
    });
  }

  /** requireAuth + blocked-account check in one step. */
  function requireActiveUser(req: express.Request, res: express.Response, next: express.NextFunction): void {
    requireAuth(req, res, () => {
      const user = req.user;
      if (!user) return;
      const reg = usersRegistry.get(user.id);
      if (reg?.blocked) {
        res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
        return;
      }
      next();
    });
  }
  app.use(express.json({ limit: '1mb' }));

  // Minimal request log: method, path, status, duration. Skipped during tests
  // to keep their output clean. Pino-http would be the next-pass upgrade.
  if (config.nodeEnv !== 'test') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        // eslint-disable-next-line no-console
        console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
      });
      next();
    });
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'cup-and-co-api', time: new Date().toISOString() });
  });

  // -------- Campuses (Phase 2.2 of UPGRADE-PLAN.md) --------
  // Public — used by the customer-web campus picker before sign-in.
  app.get('/campuses', (_req, res) => {
    const all = listCampuses();
    res.json({ campuses: all });
  });

  app.get('/campuses/:id', (req, res, next) => {
    try {
      const campus = getCampus(req.params.id as string);
      if (!campus) {
        const err = new Error('Campus not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      const kiosks = listKiosksForCampus(campus.id);
      res.json({ campus, kiosks });
    } catch (e) { next(e); }
  });

  // The current user's campus.
  app.get('/me/campus', requireAuth, (req, res) => {
    const u = getRequestUser(req);
    const profile = userProfiles.get(u.id) ?? {};
    const campusId = (profile.current_campus_id as string | undefined) ?? getDefaultCampusId();
    const campus = getCampus(campusId);
    if (!campus) {
      // Fallback: profile pointed at a removed campus; reset to default.
      const fallback = getCampus(getDefaultCampusId());
      res.json({ campus: fallback });
      return;
    }
    res.json({ campus });
  });

  app.patch('/me/campus', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const input = z.object({ campus_id: z.string().uuid() }).parse(req.body);
      if (!isValidCampusId(input.campus_id)) {
        const err = new Error('Unknown or inactive campus.') as Error & { status?: number };
        err.status = 400;
        throw err;
      }
      const profile = userProfiles.get(u.id) ?? {};
      userProfiles.set(u.id, { ...profile, current_campus_id: input.campus_id });
      const campus = getCampus(input.campus_id);
      res.json({ campus });
    } catch (e) { next(e); }
  });

  // Catalog (public)
  app.use(catalogRouter());

  // -------- Auth (phone OTP) --------
  app.post('/auth/otp/send', otpRateLimit, (req, res, next) => {
    try {
      if (config.nodeEnv === 'production') {
        const e = new Error('OTP via Supabase not yet configured for production.') as Error & { status?: number };
        e.status = 503;
        throw e;
      }
      const { phone } = otpSendSchema.parse(req.body);
      const code = process.env.DEV_OTP_OVERRIDE ?? generateOtp();
      otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
      const response: Record<string, unknown> = { ok: true, phone, message: 'OTP sent.' };
      if (process.env.DEV_OTP_OVERRIDE) response.devCode = code;
      res.json(response);
    } catch (e) { next(e); }
  });

  app.post('/auth/otp/verify', otpRateLimit, (req, res, next) => {
    try {
      if (config.nodeEnv === 'production') {
        const e = new Error('OTP via Supabase not yet configured for production.') as Error & { status?: number };
        e.status = 503;
        throw e;
      }
      // Phase 7.1: optional referralCode forwarded by the client when
      // the user came in via a /r/<code> deep link
      const verifyInput = otpVerifySchema.extend({
        referralCode: z.string().min(5).max(10).optional(),
      }).parse(req.body);
      const { phone, code } = verifyInput;
      const stored = otpStore.get(phone);
      const validOverride = process.env.DEV_OTP_OVERRIDE && code === process.env.DEV_OTP_OVERRIDE;
      if (!validOverride) {
        if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
          const e = new Error('Invalid OTP') as Error & { status?: number };
          e.status = 401;
          throw e;
        }
      }
      otpStore.delete(phone);
      // Reuse existing userId for this phone so returning users keep their data
      const existingId = phoneToUserId.get(phone);
      const userId = existingId ?? randomUUID();
      const isNewUser = !existingId;
      if (isNewUser) phoneToUserId.set(phone, userId);

      const user = {
        id: userId,
        phone,
        role: 'student' as const,
        verificationStatus: 'approved' as const,
        phoneVerified: true,
      };
      if (!usersRegistry.has(userId)) {
        usersRegistry.set(userId, {
          id: userId,
          phone,
          full_name: null,
          role: user.role,
          verification_status: user.verificationStatus,
          blocked: false,
          created_at: new Date().toISOString(),
        });
      }
      // Phase 7.1: ensure user has a referral code (idempotent)
      ensureReferralCode(userId);

      // Phase 7.1: link referee to referrer if a code was provided AND this is
      // a new signup. The repo enforces same-device + age anti-fraud.
      if (isNewUser && verifyInput.referralCode) {
        const reg = usersRegistry.get(userId)!;
        linkRefereeOnSignup({
          code: verifyInput.referralCode,
          refereeId: userId,
          ip: req.ip ?? null,
          userAgent: req.header('user-agent') ?? null,
          referrerSignedUpAt: (referrerId) => {
            const r = usersRegistry.get(referrerId);
            return r ? new Date(r.created_at) : null;
          },
          refereeSignedUpAt: new Date(reg.created_at),
        });
      }

      const token = signSession(user);
      res.json({ token, user });
    } catch (e) { next(e); }
  });

  // -------- Customer routes --------
  app.get('/me', requireAuth, (req, res) => {
    const u = getRequestUser(req);
    const profile = userProfiles.get(u.id) ?? {};
    res.json({
      user: { ...u, ...profile },
      points: userPoints.get(u.id) ?? 0,
      tier: getTierState(u.id).currentTier,
    });
  });

  // Phase 6.3 — tier read endpoint with progress to next tier.
  app.get('/me/tier', requireAuth, (req, res) => {
    const u = getRequestUser(req);
    const state = getTierState(u.id);
    const trailing = getTrailing12mPoints(u.id);
    const benefits = TIER_BENEFITS[state.currentTier];

    let nextTier: LoyaltyTier | null = null;
    let pointsToNext: number | null = null;
    if (state.currentTier === 'bronze') {
      nextTier = 'silver';
      pointsToNext = TIER_THRESHOLDS_OUT.silver - trailing;
    } else if (state.currentTier === 'silver') {
      nextTier = 'gold';
      pointsToNext = TIER_THRESHOLDS_OUT.gold - trailing;
    }

    res.json({
      tier: state.currentTier,
      tierCalculatedAt: state.tierCalculatedAt,
      trailing12mPoints: trailing,
      benefits,
      nextTier,
      pointsToNext: pointsToNext !== null ? Math.max(0, pointsToNext) : null,
      history: getTierHistory(u.id).slice(0, 10),
    });
  });

  // Phase 6.2 — streak read endpoint. Public shape so the home widget
  // can render with one fetch.
  app.get('/me/streak', requireAuth, (req, res) => {
    const u = getRequestUser(req);
    res.json({ streak: getStreakState(u.id) });
  });

  // Phase K4.10 — "Your usual" — most-ordered product over the last 60
  // days, with the customer's most-common option selections. Powers the
  // kiosk's one-tap reorder card on /catalog. Returns null if there's
  // not enough history (need at least 2 orders of the same product) so
  // the kiosk can fall back to the smart-suggestion endpoint.
  app.get('/me/usual', requireAuth, async (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const recent: Array<{ productId: string; options: Record<string, string> }> = [];
      for (const o of orders.values()) {
        if (o.userId !== u.id) continue;
        if (new Date(o.createdAt).getTime() < sixtyDaysAgo) continue;
        for (const it of o.items) {
          recent.push({ productId: it.productId, options: it.options });
        }
      }
      if (recent.length === 0) {
        res.json({ usual: null });
        return;
      }
      // Tally orders per product.
      const counts = new Map<string, number>();
      for (const r of recent) counts.set(r.productId, (counts.get(r.productId) ?? 0) + 1);
      // Need at least 2 orders to call something a "usual".
      const ranked = Array.from(counts.entries())
        .filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1]);
      if (ranked.length === 0) {
        res.json({ usual: null });
        return;
      }
      const [topProductId, orderCount] = ranked[0];

      // Most common option per group across the customer's orders of this
      // product. Lets the one-tap reorder match what they always pick
      // (Large + Oat + Less ice, say).
      const groupCounts = new Map<string, Map<string, number>>();
      for (const r of recent) {
        if (r.productId !== topProductId) continue;
        for (const [group, val] of Object.entries(r.options)) {
          if (!groupCounts.has(group)) groupCounts.set(group, new Map());
          const inner = groupCounts.get(group)!;
          inner.set(val, (inner.get(val) ?? 0) + 1);
        }
      }
      const preferredOptions: Record<string, string> = {};
      for (const [group, inner] of groupCounts) {
        let bestVal: string | null = null;
        let bestCount = 0;
        for (const [val, count] of inner) {
          if (count > bestCount) {
            bestVal = val;
            bestCount = count;
          }
        }
        if (bestVal) preferredOptions[group] = bestVal;
      }

      // Hydrate from catalog so the client can render image + name.
      const catalog = await getCatalog();
      const product = catalog.products.find((p) => p.id === topProductId);
      if (!product || !product.is_available) {
        // Don't surface unavailable products as "your usual".
        res.json({ usual: null });
        return;
      }

      res.json({
        usual: {
          productId: product.id,
          productNameEn: product.name_en,
          productNameAr: product.name_ar,
          imageUrl: product.image_url,
          basePriceEgp: product.base_price_egp,
          orderCount,
          preferredOptions,
        },
      });
    } catch (e) { next(e); }
  });

  // Phase 6.4 — smart suggestion for the home card.
  app.get('/me/suggestion', requireAuth, async (req, res, next) => {
    try {
      const u = getRequestUser(req);
      // Build flat history from this user's orders.
      const history: Array<{ productId: string; createdAt: string }> = [];
      for (const o of orders.values()) {
        if (o.userId !== u.id) continue;
        for (const it of o.items) {
          history.push({ productId: it.productId, createdAt: o.createdAt });
        }
      }
      const catalog = await getCatalog();
      const suggestion = suggestForUser({
        history,
        products: catalog.products.map((p) => ({
          id: p.id,
          name_en: p.name_en,
          name_ar: p.name_ar,
          image_url: p.image_url,
          base_price_egp: p.base_price_egp,
          is_available: p.is_available,
          is_out_of_stock: false,
          category_id: p.category_id,
        })),
      });
      if (!suggestion) {
        res.json({ suggestion: null });
        return;
      }
      res.json({ suggestion });
    } catch (e) { next(e); }
  });

  // -------- Phase 7.1 referrals --------

  // Public click tracking. Called from the /r/<code> landing page
  // (also accepts via authenticated context — no harm). Returns the
  // referral id so the client can persist a cookie / localStorage
  // entry to forward at signup.
  app.post('/referrals/track-click', (req, res, next) => {
    try {
      const { code } = z.object({ code: z.string().min(5).max(10) }).parse(req.body);
      const referral = trackReferralClick({
        code,
        ip: req.ip ?? null,
        userAgent: req.header('user-agent') ?? null,
      });
      if (!referral) {
        const err = new Error('Unknown referral code.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      res.status(201).json({ referralId: referral.id, code });
    } catch (e) { next(e); }
  });

  // Authenticated user's own code + stats + recent referrals.
  app.get('/me/referral', requireAuth, (req, res) => {
    const u = getRequestUser(req);
    const code = ensureReferralCode(u.id);
    const stats = getReferralStats(u.id);
    const recent = listReferralsByReferrer(u.id).slice(0, 20).map((r) => ({
      id: r.id,
      status: r.status,
      refClickedAt: r.refClickedAt,
      signedUpAt: r.signedUpAt,
      convertedAt: r.convertedAt,
      referrerReward: r.referrerReward,
    }));
    res.json({
      code,
      stats,
      recent,
      shareLinkPath: `/r/${code}`,
      rewards: {
        referrer: REFERRER_REWARD,
        referee: REFEREE_REWARD,
        minOrderEgp: MIN_CONVERSION_ORDER_EGP,
      },
    });
  });

  /**
   * Returns this user's variant assignments for every known feature flag.
   * Bucketing is deterministic (SHA-256 over `userId:flagName`), so the
   * client may cache the response per session without risk of drift.
   */
  app.get('/me/feature-flags', requireAuth, (req, res) => {
    const u = getRequestUser(req);
    res.json({ flags: evaluateAllFlags(u.id) });
  });

  app.patch('/me', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const input = z
        .object({
          full_name: z.string().min(1).max(120).optional(),
          role: z.enum(['student', 'faculty', 'office']).optional(),
          language_pref: z.enum(['en', 'ar']).optional(),
          biometric_enabled: z.boolean().optional(),
          university_id: z.string().min(1).max(40).optional(),
          major: z.string().min(1).max(80).optional(),
          department: z.string().min(1).max(80).optional(),
          gender: z.enum(['male', 'female', 'prefer_not_to_say']).optional(),
          avatar_id: z.number().int().min(1).max(7).optional(),
        })
        .parse(req.body);
      const existing = userProfiles.get(u.id) ?? {};
      const updated = { ...existing, ...input };
      userProfiles.set(u.id, updated);
      if (input.role) u.role = input.role;
      const verificationStatus =
        input.role && existing.verification_status !== 'approved'
          ? 'pending'
          : existing.verification_status ?? u.verificationStatus;
      res.json({
        user: { ...u, ...updated, verificationStatus },
        points: userPoints.get(u.id) ?? 0,
      });
    } catch (e) { next(e); }
  });

  /**
   * Reject an action if the caller's account is in the deletion-pending
   * state. Use on every endpoint that should NOT work during the grace
   * period (place order, scan QR, redeem points, etc.). Skip on:
   *   - /me/account/cancel-deletion (the one path back)
   *   - /me/account/status
   *   - /me/data/exports/:jobId      (download what's already prepared)
   *   - /auth/*                      (login is what brings them back)
   */
  function assertAccountActive(req: express.Request): void {
    const u = req.user;
    if (!u) return;
    if (isAccountDeleted(u.id)) {
      const err = new Error(
        'Your account is scheduled for deletion. Sign in to cancel within 30 days, or contact support.',
      ) as Error & { status?: number };
      err.status = 403;
      throw err;
    }
  }

  // -------- Account lifecycle (Phase 1.3 of UPGRADE-PLAN.md) --------
  /**
   * Step 1 — request deletion. Generates a 6-digit code and (in prod)
   * sends it via SMS. The code is keyed to the user, separate from the
   * login OTP, so it can never be intercepted and reused as a login.
   * Rate-limited via the same IP-based limiter as auth.
   */
  app.post('/me/account/delete-request', requireAuth, otpRateLimit, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      // Already in the middle of deletion? Just re-issue a fresh code.
      const { code, expiresAt } = issueDeleteOtp(u.id);
      // TODO (Phase 4.x): swap for real SMS via Vonage/Twilio integration.
      // For dev/test, return the code in the response so e2e tests can
      // exercise the flow without an SMS gateway. NOTE the comparison —
      // production envs MUST never expose the code.
      const exposeDevCode = config.nodeEnv !== 'production';
      const responseBody: Record<string, unknown> = {
        ok: true,
        expiresAt: new Date(expiresAt).toISOString(),
      };
      if (exposeDevCode) responseBody.devCode = code;
      res.json(responseBody);
    } catch (e) { next(e); }
  });

  /**
   * Step 2 — confirm deletion with the OTP. Sets `deleted_at` and starts
   * the 30-day grace window. The user's existing JWT remains valid (so
   * they can call cancel-deletion), but `assertAccountActive` blocks
   * other endpoints.
   */
  app.post('/me/account/delete-confirm', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const { code } = deleteConfirmSchema.parse(req.body);
      if (!verifyDeleteOtp(u.id, code)) {
        const err = new Error('Invalid or expired confirmation code.') as Error & { status?: number };
        err.status = 401;
        throw err;
      }
      const state = markDeletionConfirmed(u.id);
      // TODO when Supabase is wired in prod: also UPDATE users SET deleted_at,
      // deletion_requested_at via service-role client, and INSERT audit_log.
      res.json({
        ok: true,
        deletedAt: state.deletedAt,
        deletionRequestedAt: state.deletionRequestedAt,
        graceUntil: deletionGraceUntil(state),
        graceDays: ACCOUNT_GRACE_DAYS,
        message: `Your account will be permanently anonymized in ${ACCOUNT_GRACE_DAYS} days. Sign in before then to cancel.`,
      });
    } catch (e) { next(e); }
  });

  /**
   * Cancel deletion within grace window. Idempotent — calling on an
   * already-active account just confirms the state.
   */
  app.post('/me/account/cancel-deletion', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      cancelDeletion(u.id);
      // TODO when Supabase is wired: UPDATE users SET deleted_at=NULL,
      // deletion_requested_at=NULL.
      res.json({ ok: true, message: 'Account deletion cancelled. Welcome back.' });
    } catch (e) { next(e); }
  });

  /**
   * Read deletion state for the current user. Used by the client to
   * show a "your account is scheduled for deletion" banner.
   */
  app.get('/me/account/status', requireAuth, (req, res) => {
    const u = getRequestUser(req);
    const state = getDeletionState(u.id);
    if (!state) {
      res.json({ status: 'active' });
      return;
    }
    res.json({
      status: state.deletedAt ? 'deletion_pending' : 'deletion_requested',
      deletionRequestedAt: state.deletionRequestedAt,
      deletedAt: state.deletedAt,
      graceUntil: deletionGraceUntil(state),
      graceDays: ACCOUNT_GRACE_DAYS,
    });
  });

  /**
   * Request a data export. Rate-limited to one per 7 days. In prod the
   * actual export is generated by an Edge Function; in dev we generate
   * inline so the flow can be tested without Supabase Storage.
   */
  app.post('/me/data/export', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      if (!canRequestExport(u.id)) {
        const err = new Error(
          'Data export already requested in the last 7 days. Please wait before requesting another.',
        ) as Error & { status?: number };
        err.status = 429;
        throw err;
      }
      const job = createExportJob(u.id);

      // Synchronously assemble the payload from in-memory state. Each
      // section corresponds to one PII surface in the data model.
      const profile = userProfiles.get(u.id) ?? {};
      const ownedOrders = Array.from(orders.values()).filter((o) => o.userId === u.id);
      const ownedReviews = (reviews.get(u.id) ?? []).map((r) => ({ ...r }));
      const ownedFavorites = Array.from(favorites.get(u.id) ?? new Set<string>());
      const ownedLoyalty = (loyaltyHistory.get(u.id) ?? []).map((e) => ({ ...e }));
      const ownedPushDevices = pushDevices.get(u.id) ?? [];
      const ownedPrizes = prizes.get(u.id) ?? [];

      const payload = {
        exportedAt: new Date().toISOString(),
        exportFormat: 'cup-and-co.export.v1',
        notice: 'This is a complete copy of your personal data held by Cup & Co. Phone numbers, names, and university details are included. Treat this file as sensitive — store it securely and delete after use.',
        profile: { id: u.id, phone: u.phone, role: u.role, ...profile },
        points_balance: userPoints.get(u.id) ?? 0,
        orders: ownedOrders,
        reviews: ownedReviews,
        favorites: ownedFavorites,
        loyalty_history: ownedLoyalty,
        push_devices: ownedPushDevices,
        prizes: ownedPrizes,
        contact: {
          questions: 'For questions about this data export, contact support@cupandco.app',
          rights: 'Under Egypt PDPL Law 151 of 2020, you have the right to access, correct, and erase your personal data.',
        },
      };

      const completed = completeExportJob(job.id, payload);
      if (!completed) {
        const err = new Error('Export job lost during processing.') as Error & { status?: number };
        err.status = 500;
        throw err;
      }
      res.status(201).json({
        jobId: completed.id,
        status: completed.status,
        downloadUrl: `/me/data/exports/${completed.id}/download`,
        expiresAt: completed.expiresAt,
      });
    } catch (e) { next(e); }
  });

  app.get('/me/data/exports/:jobId', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const job = getExportJob(req.params.jobId as string, u.id);
      if (!job) {
        const err = new Error('Export not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      const payload: Record<string, unknown> = {
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
        doneAt: job.doneAt,
        expiresAt: job.expiresAt,
        error: job.error,
      };
      if (job.status === 'done') {
        payload.downloadUrl = `/me/data/exports/${job.id}/download`;
      }
      res.json(payload);
    } catch (e) { next(e); }
  });

  app.get('/me/data/exports/:jobId/download', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const job = getExportJob(req.params.jobId as string, u.id);
      if (!job || job.status !== 'done' || !job.payload) {
        const err = new Error('Export not ready or expired.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      // Expiry check
      if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
        const err = new Error('Export has expired. Please request a new one.') as Error & { status?: number };
        err.status = 410;
        throw err;
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cup-and-co-data-${job.id}.json"`,
      );
      res.send(JSON.stringify(job.payload, null, 2));
    } catch (e) { next(e); }
  });

  app.post('/me/verification', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const input = z
        .object({
          image_url: z.string().min(1).max(2_000_000).optional(),
          image_base64: z.string().min(1).max(8_000_000).optional(),
          notes: z.string().max(500).optional(),
        })
        .refine((v) => v.image_url || v.image_base64, {
          message: 'Provide image_url or image_base64',
        })
        .parse(req.body);
      const existing = userProfiles.get(u.id) ?? {};
      userProfiles.set(u.id, {
        ...existing,
        verification_status: 'pending',
        verification_submitted_at: new Date().toISOString(),
        verification_image_url: input.image_url ?? '[base64]',
        verification_notes: input.notes ?? null,
      });
      res.status(201).json({
        ok: true,
        status: 'pending',
        message: 'Submitted for review. You will be notified once approved.',
      });
    } catch (e) { next(e); }
  });

  // -------- Order favorites (Phase 6.1 of UPGRADE-PLAN.md) --------
  // Distinct from product `/favorites/:id` (heart icon). These are entire
  // saved order shapes — "my usual" — that one-tap reorder into the cart.

  const favoriteItemSchema = z.object({
    productId: z.string().min(1),
    productNameEn: z.string().min(1).max(120),
    productNameAr: z.string().min(1).max(120),
    imageUrl: z.string().max(2048),
    quantity: z.number().int().positive().max(20),
    options: z.record(z.string()).default({}),
    unitPriceEgp: z.number().nonnegative(),
  });

  const createFavoriteSchema = z.object({
    name: z.string().min(1).max(80),
    items: z.array(favoriteItemSchema).min(1).max(20),
    timeOfDay: z.enum(['morning', 'midday', 'evening']).nullable().optional(),
    isDefault: z.boolean().optional(),
  });

  const updateFavoriteSchema = z.object({
    name: z.string().min(1).max(80).optional(),
    items: z.array(favoriteItemSchema).min(1).max(20).optional(),
    timeOfDay: z.enum(['morning', 'midday', 'evening']).nullable().optional(),
    isDefault: z.boolean().optional(),
  });

  app.get('/me/favorites/orders', requireAuth, (req, res) => {
    const u = getRequestUser(req);
    res.json({ favorites: listOrderFavorites(u.id) });
  });

  app.post('/me/favorites/orders', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const input = createFavoriteSchema.parse(req.body);
      const fav = createOrderFavorite(u.id, {
        name: input.name,
        items: input.items.map((i) => ({ ...i })),
        timeOfDay: (input.timeOfDay ?? null) as TimeOfDay | null,
        isDefault: input.isDefault ?? false,
      });
      res.status(201).json({ favorite: fav });
    } catch (e) { next(e); }
  });

  app.get('/me/favorites/orders/:id', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const fav = getOrderFavorite(u.id, req.params.id as string);
      if (!fav) {
        const err = new Error('Favorite not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      res.json({ favorite: fav });
    } catch (e) { next(e); }
  });

  app.patch('/me/favorites/orders/:id', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const input = updateFavoriteSchema.parse(req.body);
      const fav = updateOrderFavorite(u.id, req.params.id as string, {
        ...input,
        items: input.items?.map((i) => ({ ...i })),
        timeOfDay: input.timeOfDay as TimeOfDay | null | undefined,
      });
      if (!fav) {
        const err = new Error('Favorite not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      res.json({ favorite: fav });
    } catch (e) { next(e); }
  });

  app.delete('/me/favorites/orders/:id', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const ok = deleteOrderFavorite(u.id, req.params.id as string);
      if (!ok) {
        const err = new Error('Favorite not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  /**
   * Reorder helper — returns the cart payload the client should
   * populate. Stateless: the client adds items to its own cart;
   * server-side cart isn't a thing in v1.5.
   */
  app.post('/me/favorites/orders/:id/reorder', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const fav = getOrderFavorite(u.id, req.params.id as string);
      if (!fav) {
        const err = new Error('Favorite not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      res.json({
        items: fav.items,
        favoriteId: fav.id,
        favoriteName: fav.name,
      });
    } catch (e) { next(e); }
  });

  app.post('/push/register', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const { platform, token } = z
        .object({
          platform: z.enum(['ios', 'web']),
          token: z.string().min(8).max(2000),
        })
        .parse(req.body);
      const list = pushDevices.get(u.id) ?? [];
      const filtered = list.filter((d) => d.token !== token);
      filtered.push({ platform, token, last_seen_at: new Date().toISOString() });
      pushDevices.set(u.id, filtered);
      res.status(201).json({ ok: true, registered: filtered.length });
    } catch (e) { next(e); }
  });

  app.delete('/push/register', requireAuth, (req, res, next) => {
    try {
      const u = getRequestUser(req);
      const { token } = z.object({ token: z.string().min(8) }).parse(req.body);
      const list = pushDevices.get(u.id) ?? [];
      pushDevices.set(u.id, list.filter((d) => d.token !== token));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // -------- Orders (customer) --------
  // Idempotency cache for POST /orders — keyed by user + Idempotency-Key header.
  // 5-min TTL is plenty for a flaky network retry without holding state forever.
  const orderIdempotency = new Map<string, { at: number; response: unknown }>();
  const IDEMPOTENCY_TTL_MS = 5 * 60_000;

  app.post('/orders', requireAuth, async (req, res, next) => {
    try {
      assertAccountActive(req);
      const user = getRequestUser(req);
      const idempotencyKey = req.header('Idempotency-Key')?.trim();
      if (idempotencyKey) {
        const cacheKey = `${user.id}::${idempotencyKey}`;
        const hit = orderIdempotency.get(cacheKey);
        if (hit && Date.now() - hit.at < IDEMPOTENCY_TTL_MS) {
          res.status(201).json(hit.response);
          return;
        }
      }
      const input = createOrderSchema.parse(req.body);
      if (!kioskState.is_open) {
        const e = new Error('Kiosk ordering is closed.') as Error & { status?: number };
        e.status = 409;
        throw e;
      }

      // Resolve product details from the catalog so we trust prices server-side.
      const enriched = [];
      for (const item of input.items) {
        const detail = await getProductDetail(item.productId);
        if (!detail) {
          const e = new Error(`Product not found: ${item.productId}`) as Error & { status?: number };
          e.status = 400;
          throw e;
        }
        const override = productAvailability.get(item.productId);
        const isAvailable = override ?? detail.product.is_available;
        if (!isAvailable) {
          const e = new Error(`Product unavailable: ${detail.product.name_en}`) as Error & { status?: number };
          e.status = 409;
          throw e;
        }
        // Stock count check — null means unlimited, 0 means out of stock
        const currentStock = getProductStockCount(item.productId);
        if (currentStock !== null && currentStock < item.quantity) {
          const available = currentStock <= 0 ? 'out of stock' : `only ${currentStock} left`;
          const e = new Error(`${detail.product.name_en} is ${available}.`) as Error & { status?: number };
          e.status = 409;
          throw e;
        }
        // Phase 3.2: also reject if barista flipped the staff toggle. Catches
        // the race where a customer added to cart then the toggle moved
        // before checkout. The customer-web cart guard hides add-to-cart
        // proactively.
        if (isProductOutOfStock(item.productId)) {
          const e = new Error(`Out of stock: ${detail.product.name_en}`) as Error & { status?: number };
          e.status = 409;
          throw e;
        }
        // Sum option price deltas
        let unitPrice = detail.product.base_price_egp;
        for (const [, optionName] of Object.entries(item.options)) {
          const opt = detail.options.find((o) => o.name_en === optionName || o.name_ar === optionName);
          if (opt) unitPrice += opt.price_delta_egp;
        }
        enriched.push({
          productId: detail.product.id,
          productNameEn: detail.product.name_en,
          productNameAr: detail.product.name_ar,
          imageUrl: detail.product.image_url,
          quantity: item.quantity,
          options: item.options,
          unitPriceEgp: unitPrice,
        });
      }

      const subtotal = enriched.reduce((s, it) => s + it.quantity * it.unitPriceEgp, 0);
      const discount = Math.min(calculateDiscountEgp(input.redeemPoints), subtotal);
      const total = Math.max(0, subtotal - discount);

      const pointsAwarded =
        input.paymentMethod === 'cash'
          ? calculateEarnedPoints({ amountEgp: total, source: 'cash_in_app' })
          : calculateEarnedPoints({ amountEgp: total, source: 'online_paid' });

      // Phase K1.11 / K4 — derive placement_source.
      //
      // The kiosk-auth path (K1.12) attaches req.kioskId from the
      // x-kiosk-id header. An IDENTIFIED kiosk customer (K4.4 phone+OTP)
      // sends a real JWT instead of the kiosk-bearer, but still ships the
      // x-kiosk-id header — we keep that order tagged as 'kiosk' regardless
      // of which auth path resolved the user. Trust the middleware over
      // any body field so a misconfigured customer-web client can't
      // impersonate a kiosk by self-tagging.
      const headerKioskId = req.header('x-kiosk-id') ?? null;
      const isKioskOrigin = Boolean(req.kioskId || headerKioskId);
      const placementSource = isKioskOrigin
        ? 'kiosk'
        : input.placementSource ?? 'customer_app';
      const kioskId = isKioskOrigin
        ? req.kioskId ?? headerKioskId
        : input.kioskId ?? null;

      const order = buildOrder(
        {
          userId: user.id,
          fulfillmentType: input.fulfillmentType,
          paymentMethod: input.paymentMethod,
          scheduledFor: input.scheduledFor ?? null,
          notes: input.notes ?? null,
          redeemPoints: input.redeemPoints,
          items: enriched,
          placementSource,
          kioskId,
        },
        { discountEgp: discount, pointsAwarded },
      );
      orders.set(order.id, order);

      // Decrement tracked stock counts for each item ordered
      for (const item of enriched) {
        const stock = getProductStockCount(item.productId);
        if (stock !== null) {
          setProductStockCount(item.productId, Math.max(0, stock - item.quantity));
        }
      }

      // Decrement points when redeemed
      if (input.redeemPoints > 0) {
        const balance = userPoints.get(user.id) ?? 0;
        if (input.redeemPoints > balance) {
          const e = new Error('Not enough points to redeem.') as Error & { status?: number };
          e.status = 400;
          throw e;
        }
        userPoints.set(user.id, balance - input.redeemPoints);
        recordLoyaltyEvent(user.id, 'redeemed', -input.redeemPoints, order.id);
      }

      emitOrderUpdate(order);

      // Analytics: order_placed (Phase 1.2 of UPGRADE-PLAN.md). Fired after
      // emitOrderUpdate so the customer-facing SSE update isn't blocked by a
      // potential network call to PostHog (which is queued anyway).
      trackAnalytics(user.id, {
        name: 'order_placed',
        props: {
          order_id: order.id,
          total: order.totalEgp,
          payment_method: order.paymentMethod,
          fulfillment: order.fulfillmentType,
          item_count: order.items.length,
          points_earned: order.paymentMethod === 'cash' ? 0 : pointsAwarded, // cash points credit later on completion
          currency: 'EGP',
        },
      });

      const responseBody = { order, timeline: trackingTimelineFor(order), prepEta: prepEtaFor(order) };
      if (idempotencyKey) {
        orderIdempotency.set(`${user.id}::${idempotencyKey}`, {
          at: Date.now(),
          response: responseBody,
        });
      }
      res.status(201).json(responseBody);
    } catch (e) { next(e); }
  });

  app.get('/orders/:id', requireAuth, (req, res, next) => {
    try {
      const order = orders.get(req.params.id as string);
      if (!order) {
        const e = new Error('Order not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      const user = getRequestUser(req);
      if (order.userId !== user.id && user.role !== 'owner' && user.role !== 'barista') {
        const e = new Error('Order not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      res.json({ order, timeline: trackingTimelineFor(order), prepEta: prepEtaFor(order) });
    } catch (e) { next(e); }
  });

  app.get('/orders', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    const all = Array.from(orders.values())
      .filter((o) => o.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const page = all.slice(offset, offset + limit);
    // Snapshot active orders ONCE so we don't rebuild the array per row.
    const activeOrders = Array.from(orders.values());
    const ordersWithEta = page.map((o) => ({
      ...o,
      prepEta: computePrepEta(o, activeOrders),
    }));
    res.json({ orders: ordersWithEta, total: all.length, limit, offset });
  });

  // Phase 3: SSE stream for a single order (replaces 5s polling on customer tracking)
  app.get('/orders/:id/events', requireAuth, (req, res) => {
    const order = orders.get(req.params.id as string);
    if (!order) { res.status(404).json({ error: 'Order not found.' }); return; }
    const user = getRequestUser(req);
    if (order.userId !== user.id && user.role !== 'owner' && user.role !== 'barista') {
      res.status(404).json({ error: 'Order not found.' }); return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify({ order, timeline: trackingTimelineFor(order), prepEta: prepEtaFor(order) })}\n\n`);
    const handler = (data: unknown) => { res.write(`data: ${JSON.stringify(data)}\n\n`); };
    orderEvents.on(`order:${order.id}`, handler);
    const heartbeat = setInterval(() => { res.write(': ping\n\n'); }, 25_000);
    req.on('close', () => { orderEvents.off(`order:${order.id}`, handler); clearInterval(heartbeat); });
  });

  // Phase 3: customer cancel order
  app.post('/orders/:id/cancel', requireAuth, async (req, res, next) => {
    try {
      const user = getRequestUser(req);
      const order = orders.get(req.params.id as string);
      if (!order) { const e = new Error('Order not found.') as Error & { status?: number }; e.status = 404; throw e; }
      if (order.userId !== user.id) { const e = new Error('Order not found.') as Error & { status?: number }; e.status = 404; throw e; }
      const ok = applyStatusTransition(order, 'cancelled', 'Cancelled by customer');
      if (!ok) { const e = new Error(`Cannot cancel order in status: ${order.status}`) as Error & { status?: number }; e.status = 409; throw e; }
      // Refund redeemed points
      if (order.pointsRedeemed > 0) {
        const restored = (userPoints.get(order.userId) ?? 0) + order.pointsRedeemed;
        userPoints.set(order.userId, restored);
        recordLoyaltyEvent(order.userId, 'refund', order.pointsRedeemed, order.id);
      }
      emitOrderUpdate(order);
      res.json({ order, timeline: trackingTimelineFor(order), prepEta: prepEtaFor(order) });
    } catch (e) { next(e); }
  });

  // Phase 3: favorites
  app.post('/favorites/:productId', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    const set = favorites.get(user.id) ?? new Set<string>();
    set.add(req.params.productId as string);
    favorites.set(user.id, set);
    res.status(201).json({ ok: true, productId: req.params.productId });
  });

  app.delete('/favorites/:productId', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    const set = favorites.get(user.id);
    if (set) set.delete(req.params.productId as string);
    res.json({ ok: true, productId: req.params.productId });
  });

  app.get('/favorites', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    const set = favorites.get(user.id) ?? new Set<string>();
    res.json({ productIds: Array.from(set) });
  });

  // Phase 3: reviews
  app.post('/reviews', requireAuth, (req, res, next) => {
    try {
      assertAccountActive(req);
      const user = getRequestUser(req);
      const input = z.object({
        productId: z.string().min(1),
        orderId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(500).default(''),
      }).parse(req.body);
      const order = orders.get(input.orderId);
      if (!order || order.userId !== user.id || order.status !== 'completed' ||
          !order.items.some((i) => i.productId === input.productId)) {
        const e = new Error('You can only review products from your completed orders.') as Error & { status?: number };
        e.status = 403;
        throw e;
      }
      const productReviews = reviews.get(input.productId) ?? [];
      const review = {
        id: randomUUID(),
        userId: user.id,
        productId: input.productId,
        orderId: input.orderId,
        rating: input.rating,
        comment: input.comment,
        hidden: false,
        createdAt: new Date().toISOString(),
      };
      productReviews.push(review);
      reviews.set(input.productId, productReviews);
      res.status(201).json(review);
    } catch (e) { next(e); }
  });

  // -------- Coupons --------
  interface CouponDefinition {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    descriptionEn: string;
    descriptionAr: string;
  }
  const couponStore = new Map<string, CouponDefinition>([
    ['WELCOME10', { code: 'WELCOME10', type: 'percentage', value: 10, descriptionEn: '10% off your first order', descriptionAr: '١٠٪ خصم على أول طلب' }],
    ['STUDENT15', { code: 'STUDENT15', type: 'percentage', value: 15, descriptionEn: '15% student discount', descriptionAr: '١٥٪ خصم الطلاب' }],
    ['COFFEE20', { code: 'COFFEE20', type: 'fixed', value: 20, descriptionEn: 'EGP 20 off', descriptionAr: '٢٠ جنيه خصم' }],
  ]);

  app.post('/coupons/validate', requireAuth, (req, res, next) => {
    try {
      const { code } = z.object({ code: z.string().min(1).max(40) }).parse(req.body);
      const coupon = couponStore.get(code.toUpperCase());
      if (!coupon) {
        res.json({ ok: false, reason: 'Invalid or expired coupon code.' });
        return;
      }
      res.json({ ok: true, type: coupon.type, value: coupon.value, descriptionEn: coupon.descriptionEn, descriptionAr: coupon.descriptionAr });
    } catch (e) { next(e); }
  });

  // -------- Payments --------
  app.post('/payments/paymob/intention', requireAuth, (req, res, next) => {
    try {
      const user = getRequestUser(req);
      const input = paymobIntentionSchema.parse(req.body);
      const order = orders.get(input.orderId);
      if (!order || order.userId !== user.id) {
        const e = new Error('Order not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      const intention = paymob.createIntention({
        orderId: order.id,
        userId: order.userId,
        amountEgp: order.totalEgp,
        method: input.method,
      });
      res.status(201).json(intention);
    } catch (e) { next(e); }
  });

  app.post('/webhooks/paymob', async (req, res, next) => {
    try {
      const payload = paymobCallbackSchema.parse(req.body);
      const hmac = String(req.header('x-paymob-hmac') ?? '');
      const result = paymob.handleCallback(payload, hmac);
      const order = orders.get(result.orderId);
      if (order) {
        if (order.paymentStatus === 'paid') {
          res.json({ already_processed: true });
          return;
        }
        if (Number(payload.amountEgp) !== order.totalEgp) {
          res.status(422).json({ error: 'Amount mismatch.' });
          return;
        }
        order.paymentStatus = result.paymentStatus;
        if (result.paymentStatus === 'paid') {
          const earned = calculateEarnedPoints({
            amountEgp: order.totalEgp,
            source: 'online_paid',
          });
          // Phase 6.3 — apply tier multiplier (Bronze 1.0×, Silver 1.25×, Gold 1.5×)
          const tieredEarned = applyTierMultiplier(order.userId, earned);
          userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + tieredEarned);
          recordLoyaltyEvent(order.userId, 'online_paid', tieredEarned, order.id);
          // Recalculate tier after credit so a customer who just crossed
          // the threshold sees the new tier on next refresh.
          recalculateOnEarn(order.userId, getTrailing12mPoints);
          // Phase 6.2 — record the paid order against the user's streak.
          // Day-7 multiples grant a +50 pt bonus.
          {
            const streakResult = recordOrderForStreak(order.userId);
            if (streakResult.bonusEarned) {
              userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + 50);
              recordLoyaltyEvent(order.userId, 'streak_bonus', 50, order.id);
            }
          }
          // Phase 7.1: try referral conversion on this paid order.
          {
            const ref = tryConvertReferralOnFirstPaidOrder({
              refereeId: order.userId,
              orderTotalEgp: order.totalEgp,
            });
            if (ref && ref.status === 'converted' && ref.referrerReward && ref.refereeReward) {
              userPoints.set(ref.referrerId, (userPoints.get(ref.referrerId) ?? 0) + ref.referrerReward);
              recordLoyaltyEvent(ref.referrerId, 'referral', ref.referrerReward, order.id);
              userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + ref.refereeReward);
              recordLoyaltyEvent(order.userId, 'referral_signup_bonus', ref.refereeReward, order.id);
            }
          }
          if (order.status === 'received') {
            applyStatusTransition(order, 'accepted', 'auto-accept on payment');
            await notifyOrderStatus(order, 'accepted');
          }
          emitOrderUpdate(order);
        }
      }
      res.json(result);
    } catch (e) { next(e); }
  });

  // -------- Loyalty --------
  app.get('/loyalty', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    const balance = userPoints.get(user.id) ?? 0;
    const all = (loyaltyHistory.get(user.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const history = all.slice(offset, offset + limit);
    res.json({
      balance,
      discountAvailableEgp: calculateDiscountEgp(balance),
      history,
      total: all.length,
      limit,
      offset,
    });
  });

  app.post('/loyalty/redeem-qr', requireAuth, (req, res, next) => {
    try {
      const user = getRequestUser(req);
      const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
      const result = qrReceipts.claimReceipt({
        receiptToken: code,
        userId: user.id,
        phoneVerified: user.phoneVerified,
      });
      const newBalance = (userPoints.get(user.id) ?? 0) + result.pointsAwarded;
      userPoints.set(user.id, newBalance);
      recordLoyaltyEvent(user.id, 'qr_receipt', result.pointsAwarded);
      res.status(201).json(result);
    } catch (e) { next(e); }
  });

  // -------- Games --------
  app.post('/games/sessions', requireAuth, (req, res, next) => {
    try {
      assertAccountActive(req);
      const user = getRequestUser(req);
      const session = games.startSession({
        userId: user.id,
        role: user.role,
        verificationStatus: user.verificationStatus,
      });
      res.status(201).json(session);
    } catch (e) { next(e); }
  });

  app.get('/games/sessions/me', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    res.json(games.getDailyStatus(user.id));
  });

  app.post('/games/scores', requireAuth, (req, res, next) => {
    try {
      assertAccountActive(req);
      const user = getRequestUser(req);
      const input = submitScoreSchema.parse(req.body);
      const result = games.submitScore({ ...input, userId: user.id });
      // Award loyalty points equal to game score
      if (result.pointsAwarded > 0) {
        userPoints.set(user.id, (userPoints.get(user.id) ?? 0) + result.pointsAwarded);
        recordLoyaltyEvent(user.id, 'game_reward', result.pointsAwarded);
      }
      res.status(201).json(result);
    } catch (e) { next(e); }
  });

  app.get('/leaderboard/current', (_req, res) => {
    const entries = games.getCurrentLeaderboard().map((e) => {
      const user = usersRegistry.get(e.userId);
      const fullName = user?.full_name ?? '';
      // Initials from full name, or last-4 of userId as a privacy-preserving fallback.
      const displayName = fullName
        ? fullName.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || `…${e.userId.slice(-4)}`
        : `…${e.userId.slice(-4)}`;
      return { ...e, displayName };
    });
    res.json({ entries });
  });

  app.get('/leaderboard/me', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    res.json(games.getMyRank(user.id));
  });

  // Phase 4: customer prize list
  app.get('/prizes', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    const myPrizes = (prizes.get(user.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ prizes: myPrizes });
  });

  // Phase 4: settle weekly leaderboard (also triggered by admin)
  function settleLeaderboard(weekKey: string): { settled: boolean; prizes: Prize[]; weekKey: string } {
    if (settledWeeks.has(weekKey)) return { settled: false, prizes: [], weekKey };
    settledWeeks.add(weekKey);

    const board = games.getCurrentLeaderboard().filter((e) => e.weekKey === weekKey);
    const issued: Prize[] = [];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const prizeRules: Array<{ rank: number; type: Prize['type']; description: string }> = [
      { rank: 1, type: 'free_combo',      description: '1 free drink + 1 dessert' },
      { rank: 2, type: 'free_drink',      description: '1 free drink of your choice' },
      { rank: 3, type: 'percentage_off',  description: '50% off your next order' },
    ];

    for (const rule of prizeRules) {
      const entry = board.find((e) => e.rank === rule.rank);
      if (!entry) continue;
      const prize: Prize = {
        id: randomUUID(),
        userId: entry.userId,
        weekKey,
        rank: rule.rank,
        type: rule.type,
        description: rule.description,
        code: `PRIZE-${weekKey}-${rule.rank}-${randomUUID().slice(0, 6).toUpperCase()}`,
        redeemedAt: null,
        expiresAt,
        createdAt: new Date().toISOString(),
      };
      const list = prizes.get(entry.userId) ?? [];
      list.push(prize);
      prizes.set(entry.userId, list);
      issued.push(prize);
    }

    return { settled: true, prizes: issued, weekKey };
  }

  app.post('/admin/leaderboard/settle', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'leaderboard:settle');
      const { weekKey } = z.object({ weekKey: z.string().min(1).optional() }).parse(req.body);
      const targetWeek = weekKey ?? games.getCurrentLeaderboard()[0]?.weekKey ?? new Date().toISOString().slice(0, 10);
      const result = settleLeaderboard(targetWeek);
      res.status(201).json(result);
    } catch (e) { next(e); }
  });

  // -------- Admin --------
  app.get('/admin/orders', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'orders:update_status');
      res.json({
        orders: Array.from(orders.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      });
    } catch (e) { next(e); }
  });

  // Phase 3: SSE stream for all orders (admin kanban real-time)
  app.get('/admin/orders/events', requireAuth, requireAdmin, (req, res) => {
    try { assertAdminPermission(getAdminRole(req), 'orders:update_status'); } catch { res.status(403).end(); return; }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const allOrders = Array.from(orders.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.write(`data: ${JSON.stringify({ orders: allOrders })}\n\n`);
    const handler = (data: unknown) => { res.write(`data: ${JSON.stringify(data)}\n\n`); };
    orderEvents.on('orders:all', handler);
    const heartbeat = setInterval(() => { res.write(': ping\n\n'); }, 25_000);
    req.on('close', () => { orderEvents.off('orders:all', handler); clearInterval(heartbeat); });
  });

  app.get('/admin/orders/:id', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'orders:update_status');
      const order = orders.get(req.params.id as string);
      if (!order) {
        const e = new Error('Order not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      res.json({ order, timeline: trackingTimelineFor(order), prepEta: prepEtaFor(order) });
    } catch (e) { next(e); }
  });

  app.patch('/admin/orders/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'orders:update_status');
      const { status, note } = updateOrderStatusSchema.parse(req.body);
      const order = orders.get(req.params.id as string);
      if (!order) {
        const e = new Error('Order not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      const ok = applyStatusTransition(order, status, note);
      if (!ok) {
        const e = new Error(`Illegal status transition ${order.status} → ${status}`) as Error & { status?: number };
        e.status = 409;
        throw e;
      }
      // On cash 'completed', mark paid + award cash points
      if (status === 'completed' && order.paymentMethod === 'cash' && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        const baseEarned = calculateEarnedPoints({ amountEgp: order.totalEgp, source: 'cash_in_app' });
        // Phase 6.3 — apply tier multiplier
        const earned = applyTierMultiplier(order.userId, baseEarned);
        userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + earned);
        recordLoyaltyEvent(order.userId, 'cash_in_app', earned, order.id);
        recalculateOnEarn(order.userId, getTrailing12mPoints);
        // Phase 6.2 — streak update on cash completion.
        const streakResult = recordOrderForStreak(order.userId);
        if (streakResult.bonusEarned) {
          userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + 50);
          recordLoyaltyEvent(order.userId, 'streak_bonus', 50, order.id);
        }
        // Phase 7.1: try referral conversion on this paid order.
        const ref = tryConvertReferralOnFirstPaidOrder({
          refereeId: order.userId,
          orderTotalEgp: order.totalEgp,
        });
        if (ref && ref.status === 'converted' && ref.referrerReward && ref.refereeReward) {
          userPoints.set(ref.referrerId, (userPoints.get(ref.referrerId) ?? 0) + ref.referrerReward);
          recordLoyaltyEvent(ref.referrerId, 'referral', ref.referrerReward, order.id);
          userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + ref.refereeReward);
          recordLoyaltyEvent(order.userId, 'referral_signup_bonus', ref.refereeReward, order.id);
        }
      }
      // On cancel/refund: refund redeemed points and reverse any awarded points
      if (status === 'cancelled' || status === 'refunded') {
        if (order.pointsRedeemed > 0) {
          const restored = (userPoints.get(order.userId) ?? 0) + order.pointsRedeemed;
          userPoints.set(order.userId, restored);
          recordLoyaltyEvent(order.userId, 'refund', order.pointsRedeemed, order.id);
        }
      }
      if (['accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'].includes(status)) {
        await notifyOrderStatus(order, status as Parameters<typeof statusNotificationCopy>[0]['status']);
      }
      emitOrderUpdate(order);

      // Analytics: order_status_changed + order_completed (Phase 1.2).
      const previousStatus = order.statusHistory[order.statusHistory.length - 2]?.status ?? 'received';
      trackAnalytics(order.userId, {
        name: 'order_status_changed',
        props: { order_id: order.id, from_status: previousStatus, to_status: status },
      });
      if (status === 'completed') {
        const created = new Date(order.createdAt).getTime();
        const completed = Date.now();
        const minutes = Math.max(0, Math.round((completed - created) / 60_000));
        trackAnalytics(order.userId, {
          name: 'order_completed',
          props: { order_id: order.id, time_to_completion_min: minutes },
        });
      }
      res.json({ order, timeline: trackingTimelineFor(order), prepEta: prepEtaFor(order) });
    } catch (e) { next(e); }
  });

  app.post('/admin/qr-receipts', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'qr_receipts:create');
      const input = z.object({ orderTotalEgp: z.number().positive() }).parse(req.body);
      const receipt = qrReceipts.createReceipt({
        orderTotalEgp: input.orderTotalEgp,
        createdByAdminId: getRequestUser(req).id,
      });
      res.status(201).json(receipt);
    } catch (e) { next(e); }
  });

  app.get('/admin/summary', requireAuth, requireAdmin, (req, res, next) => {
    try {
      const role = getAdminRole(req);
      assertAdminPermission(role, 'reports:view_today');
      const all = Array.from(orders.values());
      const todayRevenue = all.reduce((s, o) => (o.paymentStatus === 'paid' ? s + o.totalEgp : s), 0);
      res.json({
        todayRevenueEgp: todayRevenue,
        activeOrders: all.filter((o) => !['completed', 'cancelled', 'refunded'].includes(o.status)).length,
        kioskOpen: kioskState.is_open,
        fullReportsVisible: role === 'owner',
      });
    } catch (e) { next(e); }
  });

  app.get('/admin/kiosk/status', requireAuth, requireAdmin, (_req, res) => {
    res.json(kioskState);
  });

  app.patch('/admin/kiosk/status', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'kiosk:update_open_status');
      const input = z
        .object({
          is_open: z.boolean().optional(),
          message_en: z.string().min(1).max(200).nullable().optional(),
          message_ar: z.string().min(1).max(200).nullable().optional(),
          capacity_per_slot: z.number().int().positive().max(60).optional(),
          slot_minutes: z.number().int().positive().max(60).optional(),
          opens_at: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          closes_at: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        })
        .parse(req.body);

      // Owner-only fields
      const role = getAdminRole(req);
      const ownerOnly = ['capacity_per_slot', 'slot_minutes', 'opens_at', 'closes_at'] as const;
      for (const key of ownerOnly) {
        if (input[key] !== undefined && role !== 'owner') {
          const e = new Error(`Owner-only setting: ${key}`) as Error & { status?: number };
          e.status = 403;
          throw e;
        }
      }
      Object.assign(kioskState, input);
      res.json(kioskState);
    } catch (e) { next(e); }
  });

  app.patch('/admin/menu/products/:id/availability', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'menu:update_availability');
      const input = z.object({ available: z.boolean() }).parse(req.body);
      productAvailability.set(req.params.id as string, input.available);
      res.json({ id: req.params.id, available: input.available });
    } catch (e) { next(e); }
  });

  // Phase K4.7 — admin-toggleable "feature today" flag. The kiosk renders
  // the first featured product as a 2-column hero card at the top of the
  // catalog "All" tab.
  app.patch('/admin/menu/products/:id/featured-today', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'menu:update_availability');
      const input = z.object({ featured: z.boolean() }).parse(req.body);
      setFeaturedProduct(req.params.id as string, input.featured);
      res.json({ id: req.params.id, featured: input.featured });
    } catch (e) { next(e); }
  });

  // Phase K4.9 — admin override for "Complete the combo" pairings.
  // Body: { pairs: string[] } where each entry is a productId. Empty
  // array is a valid override that means "no pairings for this product".
  app.put('/admin/menu/products/:id/pairs', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'menu:update_availability');
      const input = z.object({
        pairs: z.array(z.string().min(1)).max(8),
      }).parse(req.body);
      setProductPairs(req.params.id as string, input.pairs);
      res.json({ id: req.params.id, pairs: input.pairs });
    } catch (e) { next(e); }
  });

  // ── Phase K6.1 / K6.3 — kiosks registry + health ─────────────────────
  // Kiosks heartbeat their identity + current state every 60s. We
  // auto-create the registry row on first contact (no pre-provisioning
  // step), so a brand new iPad just needs its KIOSK_ID env var set and
  // it'll show up in /admin/kiosks within a minute.

  /** Kiosk-bearer authed; uses the x-kiosk-id header from kiosk-auth. */
  app.post('/kiosks/heartbeat', requireAuth, (req, res, next) => {
    try {
      const kioskId = req.kioskId ?? req.header('x-kiosk-id');
      if (!kioskId) {
        const e = new Error('x-kiosk-id required for heartbeat.') as Error & { status?: number };
        e.status = 400;
        throw e;
      }
      const input = z.object({
        state: z.enum([
          'attract',
          'browsing',
          'customizing',
          'checkout',
          'confirmation',
          'cleaning',
          'unknown',
        ]),
        version: z.string().max(40).nullable().optional(),
      }).parse(req.body);
      const kiosk = recordKioskHeartbeat({
        kioskId,
        state: input.state as KioskState,
        version: input.version ?? null,
      });
      res.json({ kiosk });
    } catch (e) { next(e); }
  });

  /** Admin lists all known kiosks, freshest heartbeat first. */
  app.get('/admin/kiosks', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'orders:update_status');
      res.json({ kiosks: listKiosks() });
    } catch (e) { next(e); }
  });

  /**
   * Admin updates a kiosk's mutable fields (name + active flag). The
   * id and lastSeen* fields are owned by the kiosk's own heartbeat —
   * admin can't fake a heartbeat from here.
   */
  app.patch('/admin/kiosks/:id', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'orders:update_status');
      const input = z.object({
        name: z.string().min(1).max(80).optional(),
        active: z.boolean().optional(),
      }).parse(req.body);
      const kiosk = updateKiosk(req.params.id as string, input);
      if (!kiosk) {
        const e = new Error('Kiosk not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      res.json({ kiosk });
    } catch (e) { next(e); }
  });

  // Phase 3.2: stock toggle (separate from availability — staff use this
  // for "ran out of beans" while leaving the product on the menu for
  // tomorrow). Optional `until` auto-clears at that timestamp.
  app.patch('/admin/menu/products/:id/stock', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'menu:update_availability');
      const input = z
        .object({
          is_out_of_stock: z.boolean(),
          out_of_stock_until: z.string().datetime().nullable().optional(),
        })
        .parse(req.body);
      const next = setProductStock(req.params.id as string, {
        is_out_of_stock: input.is_out_of_stock,
        out_of_stock_until: input.out_of_stock_until ?? null,
      });
      res.json({ id: req.params.id, ...next });
    } catch (e) { next(e); }
  });

  app.get('/admin/menu/products/:id/stock', requireAuth, requireAdmin, (req, res) => {
    res.json({ id: req.params.id, ...getProductStock(req.params.id as string) });
  });

  app.post('/admin/menu/products', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'menu:manage');
      const input = z.object({
        category_id: z.string().min(1),
        name_en: z.string().min(1).max(80),
        name_ar: z.string().min(1).max(80),
        description_en: z.string().max(500).optional().nullable(),
        description_ar: z.string().max(500).optional().nullable(),
        base_price_egp: z.number().positive().max(10_000),
        image_url: z.string().max(500).optional().nullable(),
        prep_minutes: z.number().int().min(1).max(60).optional().nullable(),
      }).parse(req.body);
      const product = addProduct(input);
      res.status(201).json({ product });
    } catch (e) { next(e); }
  });

  app.patch('/admin/menu/products/:id', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'menu:manage');
      const id = req.params.id as string;
      if (!isExtraProduct(id)) {
        res.status(400).json({ error: 'Seed products are read-only. Toggle availability instead.' });
        return;
      }
      const input = z.object({
        category_id: z.string().min(1).optional(),
        name_en: z.string().min(1).max(80).optional(),
        name_ar: z.string().min(1).max(80).optional(),
        description_en: z.string().max(500).optional().nullable(),
        description_ar: z.string().max(500).optional().nullable(),
        base_price_egp: z.number().positive().max(10_000).optional(),
        image_url: z.string().max(500).optional().nullable(),
        prep_minutes: z.number().int().min(1).max(60).optional().nullable(),
        is_available: z.boolean().optional(),
      }).parse(req.body);
      const product = updateExtraProduct(id, input);
      if (!product) { res.status(404).json({ error: 'Product not found.' }); return; }
      res.json({ product });
    } catch (e) { next(e); }
  });

  app.delete('/admin/menu/products/:id', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'menu:manage');
      const id = req.params.id as string;
      if (!isExtraProduct(id)) {
        res.status(400).json({ error: 'Seed products cannot be deleted. Mark them out of stock instead.' });
        return;
      }
      const ok = deleteExtraProduct(id);
      if (!ok) { res.status(404).json({ error: 'Product not found.' }); return; }
      res.status(204).end();
    } catch (e) { next(e); }
  });

  // Set the review display mode for a product ('full' | 'write_only' | 'hidden').
  app.patch('/admin/menu/products/:id/review-mode', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'reviews:manage');
      const input = z.object({
        review_mode: z.enum(['full', 'write_only', 'hidden']),
      }).parse(req.body);
      setProductReviewMode(req.params.id as string, input.review_mode);
      res.json({ id: req.params.id, review_mode: input.review_mode });
    } catch (e) { next(e); }
  });

  // Set the stock count for a product. null = unlimited; 0 = out of stock.
  app.patch('/admin/menu/products/:id/stock', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'menu:update_availability');
      const input = z.object({
        stock_count: z.number().int().nonnegative().nullable(),
      }).parse(req.body);
      setProductStockCount(req.params.id as string, input.stock_count);
      res.json({ id: req.params.id, stock_count: input.stock_count });
    } catch (e) { next(e); }
  });


  // -------- Phase 5: Admin Reviews --------
  app.get('/admin/reviews', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'reviews:manage');
      const all: Array<{
        id: string;
        userId: string;
        productId: string;
        orderId: string | null;
        rating: number;
        comment: string;
        hidden: boolean;
        createdAt: string;
        userName?: string;
      }> = [];
      for (const [, list] of reviews) {
        for (const r of list) {
          const profile = userProfiles.get(r.userId);
          all.push({
            ...r,
            userName: (profile?.full_name as string) ?? r.userId.slice(0, 8),
          });
        }
      }
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json({ reviews: all });
    } catch (e) { next(e); }
  });

  app.patch('/admin/reviews/:id/visibility', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'reviews:manage');
      const { hidden } = z.object({ hidden: z.boolean() }).parse(req.body);
      let found = false;
      for (const [, list] of reviews) {
        const review = list.find((r) => r.id === req.params.id);
        if (review) {
          review.hidden = hidden;
          found = true;
          break;
        }
      }
      if (!found) {
        const e = new Error('Review not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      res.json({ id: req.params.id, hidden });
    } catch (e) { next(e); }
  });

  // -------- Phase 5: Admin Users --------
  app.get('/admin/users', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'users:verify');
      const statusFilter = req.query.status as string | undefined;
      let all = Array.from(usersRegistry.values());
      if (statusFilter) {
        all = all.filter((u) => u.verification_status === statusFilter);
      }
      res.json({ users: all.sort((a, b) => b.created_at.localeCompare(a.created_at)) });
    } catch (e) { next(e); }
  });

  app.patch('/admin/users/:id/verify', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'users:verify');
      const { status } = z.object({ status: z.enum(['approved', 'rejected']) }).parse(req.body);
      const user = usersRegistry.get(req.params.id as string);
      if (!user) {
        const e = new Error('User not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      user.verification_status = status;
      res.json({ id: user.id, verification_status: status });
    } catch (e) { next(e); }
  });

  app.patch('/admin/users/:id/block', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'users:block');
      const { blocked } = z.object({ blocked: z.boolean() }).parse(req.body);
      const user = usersRegistry.get(req.params.id as string);
      if (!user) {
        const e = new Error('User not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      user.blocked = blocked;
      res.json({ id: user.id, blocked });
    } catch (e) { next(e); }
  });

  // -------- Phase 5: Admin Offers --------
  app.get('/admin/offers', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'offers:manage');
      const now = new Date().toISOString();
      const scope = req.query.scope as string | undefined;
      let list = [...adminOffers];
      if (scope === 'active') {
        list = list.filter((o) => o.starts_at <= now && o.ends_at >= now);
      } else if (scope === 'upcoming') {
        list = list.filter((o) => o.starts_at > now);
      } else if (scope === 'expired') {
        list = list.filter((o) => o.ends_at < now);
      }
      res.json({ offers: list.sort((a, b) => b.starts_at.localeCompare(a.starts_at)) });
    } catch (e) { next(e); }
  });

  app.post('/admin/offers', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'offers:manage');
      const input = z.object({
        name_en: z.string().min(1).max(120),
        name_ar: z.string().min(1).max(120),
        type: z.enum(['percentage', 'fixed', 'free_item']),
        value: z.number().nonnegative(),
        starts_at: z.string().datetime(),
        ends_at: z.string().datetime(),
        target_roles: z.array(z.enum(['student', 'faculty', 'office', 'owner', 'barista'])),
        code: z.string().min(1).max(40).nullable().optional(),
        usage_limit: z.number().int().nonnegative().nullable().optional(),
      }).parse(req.body);
      const offer = {
        id: randomUUID(),
        ...input,
        code: input.code ?? null,
        usage_limit: input.usage_limit ?? null,
        usage_count: 0,
      };
      adminOffers.push(offer);
      res.status(201).json(offer);
    } catch (e) { next(e); }
  });

  app.patch('/admin/offers/:id', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'offers:manage');
      const idx = adminOffers.findIndex((o) => o.id === req.params.id);
      if (idx === -1) {
        const e = new Error('Offer not found.') as Error & { status?: number };
        e.status = 404;
        throw e;
      }
      const input = z.object({
        name_en: z.string().min(1).max(120).optional(),
        name_ar: z.string().min(1).max(120).optional(),
        type: z.enum(['percentage', 'fixed', 'free_item']).optional(),
        value: z.number().nonnegative().optional(),
        starts_at: z.string().datetime().optional(),
        ends_at: z.string().datetime().optional(),
        target_roles: z.array(z.enum(['student', 'faculty', 'office', 'owner', 'barista'])).optional(),
        code: z.string().min(1).max(40).nullable().optional(),
        usage_limit: z.number().int().nonnegative().nullable().optional(),
      }).parse(req.body);
      adminOffers[idx] = { ...adminOffers[idx], ...input };
      res.json(adminOffers[idx]);
    } catch (e) { next(e); }
  });

  // -------- Phase 5: Admin Reports --------
  app.get('/admin/reports/revenue', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'reports:view_full');
      const all = Array.from(orders.values());
      const paid = all.filter((o) => o.paymentStatus === 'paid');
      const today = new Date().toISOString().slice(0, 10);
      const todayRevenue = paid
        .filter((o) => o.createdAt.startsWith(today))
        .reduce((s, o) => s + o.totalEgp, 0);
      const totalRevenue = paid.reduce((s, o) => s + o.totalEgp, 0);
      res.json({ todayRevenueEgp: todayRevenue, totalRevenueEgp: totalRevenue, paidOrders: paid.length });
    } catch (e) { next(e); }
  });

  app.get('/admin/reports/top-items', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'reports:view_full');
      const counts = new Map<string, { name_en: string; count: number; revenue: number }>();
      for (const order of orders.values()) {
        for (const item of order.items) {
          const existing = counts.get(item.productId) ?? { name_en: item.productNameEn, count: 0, revenue: 0 };
          existing.count += item.quantity;
          existing.revenue += item.lineTotalEgp;
          counts.set(item.productId, existing);
        }
      }
      const top = Array.from(counts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      res.json({ topItems: top });
    } catch (e) { next(e); }
  });

  app.get('/admin/reports/role-breakdown', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'reports:view_full');
      const roleCounts = new Map<string, { orders: number; revenue: number }>();
      for (const order of orders.values()) {
        const profile = userProfiles.get(order.userId);
        const role = (profile?.role as string) ?? 'student';
        const existing = roleCounts.get(role) ?? { orders: 0, revenue: 0 };
        existing.orders += 1;
        if (order.paymentStatus === 'paid') existing.revenue += order.totalEgp;
        roleCounts.set(role, existing);
      }
      res.json({ breakdown: Object.fromEntries(roleCounts) });
    } catch (e) { next(e); }
  });

  // Sentry's Express error handler must run BEFORE our own errorHandler so
  // the exception is captured and tagged with the request scope. It only
  // forwards 5xx errors by default; 4xx (validation) stay in our handler.
  // See docs/UPGRADE-PLAN.md task 1.1.
  Sentry.setupExpressErrorHandler(app);

  app.use(errorHandler);
  return app;
}
