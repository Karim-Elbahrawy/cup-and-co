import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { errorHandler } from './http/errors.js';
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
import { createPushService, statusNotificationCopy } from './services/push.js';
import { catalogRouter } from './routes/catalog.js';
import { getProductDetail } from './db/catalogRepo.js';
import { adminOffers } from './db/offersStore.js';

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

// -------------- Helpers --------------

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
}

function emitOrderUpdate(order: Order) {
  orderEvents.emit(`order:${order.id}`, { order, timeline: trackingTimelineFor(order) });
  orderEvents.emit('orders:all', { order, timeline: trackingTimelineFor(order) });
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

  app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*' }));

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

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'cup-and-co-api', time: new Date().toISOString() });
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
      const { phone, code } = otpVerifySchema.parse(req.body);
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
      if (!existingId) phoneToUserId.set(phone, userId);

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
    });
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

      const order = buildOrder(
        {
          userId: user.id,
          fulfillmentType: input.fulfillmentType,
          paymentMethod: input.paymentMethod,
          scheduledFor: input.scheduledFor ?? null,
          notes: input.notes ?? null,
          redeemPoints: input.redeemPoints,
          items: enriched,
        },
        { discountEgp: discount, pointsAwarded },
      );
      orders.set(order.id, order);

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
      const responseBody = { order, timeline: trackingTimelineFor(order) };
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
      res.json({ order, timeline: trackingTimelineFor(order) });
    } catch (e) { next(e); }
  });

  app.get('/orders', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    const own = Array.from(orders.values()).filter((o) => o.userId === user.id);
    res.json({ orders: own.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
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
    res.write(`data: ${JSON.stringify({ order, timeline: trackingTimelineFor(order) })}\n\n`);
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
      res.json({ order, timeline: trackingTimelineFor(order) });
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
          userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + earned);
          recordLoyaltyEvent(order.userId, 'online_paid', earned, order.id);
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
    const history = (loyaltyHistory.get(user.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ balance, discountAvailableEgp: calculateDiscountEgp(balance), history });
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
      res.json({ order, timeline: trackingTimelineFor(order) });
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
        const earned = calculateEarnedPoints({ amountEgp: order.totalEgp, source: 'cash_in_app' });
        userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + earned);
        recordLoyaltyEvent(order.userId, 'cash_in_app', earned, order.id);
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
      res.json({ order, timeline: trackingTimelineFor(order) });
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

  app.use(errorHandler);
  return app;
}
