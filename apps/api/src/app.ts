import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { errorHandler } from './http/errors.js';
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

// In-memory demo store. Catalog reads come from `db/catalogRepo.ts` (Supabase
// if configured, fixture otherwise). Phase 3 will move orders/loyalty/games
// to Supabase too; the public surface stays stable.
const orders = new Map<string, Order>();
const userPoints = new Map<string, number>();
const userProfiles = new Map<string, Record<string, unknown>>();
const pushDevices = new Map<string, Array<{ platform: 'ios' | 'web'; token: string; last_seen_at: string }>>();

// Admin-mutable kiosk state. Phase 3 promotes to a Supabase row.
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

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'cup-and-co-api', time: new Date().toISOString() });
  });

  // Catalog (public)
  app.use(catalogRouter());

  // -------- Auth (phone OTP) --------
  app.post('/auth/otp/send', (req, res, next) => {
    try {
      const { phone } = otpSendSchema.parse(req.body);
      // TODO Phase 3: supabase.auth.signInWithOtp({ phone })
      res.json({ ok: true, phone, devCode: '000000', message: 'OTP sent (dev stub).' });
    } catch (e) { next(e); }
  });

  app.post('/auth/otp/verify', (req, res, next) => {
    try {
      const { phone, code } = otpVerifySchema.parse(req.body);
      if (code !== '000000') throw new Error('Invalid OTP');
      const user = {
        id: randomUUID(),
        phone,
        role: 'student' as const,
        verificationStatus: 'approved' as const,
        phoneVerified: true,
      };
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
  app.post('/orders', requireAuth, async (req, res, next) => {
    try {
      const user = getRequestUser(req);
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
        if (input.redeemPoints > balance) throw new Error('Not enough points to redeem.');
        userPoints.set(user.id, balance - input.redeemPoints);
      }

      res.status(201).json({ order, timeline: trackingTimelineFor(order) });
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

  // -------- Payments --------
  app.post('/payments/paymob/intention', requireAuth, (req, res, next) => {
    try {
      const input = paymobIntentionSchema.parse(req.body);
      const order = orders.get(input.orderId);
      if (!order) throw new Error('Order not found.');
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
        order.paymentStatus = result.paymentStatus;
        if (result.paymentStatus === 'paid') {
          const earned = calculateEarnedPoints({
            amountEgp: order.totalEgp,
            source: 'online_paid',
          });
          userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + earned);
          // Auto-advance to accepted on paid card orders
          if (order.status === 'received') {
            applyStatusTransition(order, 'accepted', 'auto-accept on payment');
            await notifyOrderStatus(order, 'accepted');
          }
        }
      }
      res.json(result);
    } catch (e) { next(e); }
  });

  // -------- Loyalty --------
  app.get('/loyalty', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    const balance = userPoints.get(user.id) ?? 0;
    res.json({ balance, discountAvailableEgp: calculateDiscountEgp(balance) });
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
      userPoints.set(user.id, (userPoints.get(user.id) ?? 0) + result.pointsAwarded);
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

  app.post('/games/scores', requireAuth, (req, res, next) => {
    try {
      const user = getRequestUser(req);
      const input = submitScoreSchema.parse(req.body);
      const result = games.submitScore({ ...input, userId: user.id });
      res.status(201).json(result);
    } catch (e) { next(e); }
  });

  app.get('/leaderboard/current', (_req, res) => {
    res.json({ entries: games.getCurrentLeaderboard() });
  });

  app.get('/leaderboard/me', requireAuth, (req, res) => {
    const user = getRequestUser(req);
    res.json(games.getMyRank(user.id));
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
      }
      // Push notify the customer for visible transitions
      if (['accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'].includes(status)) {
        await notifyOrderStatus(order, status as Parameters<typeof statusNotificationCopy>[0]['status']);
      }
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

  app.use(errorHandler);
  return app;
}
