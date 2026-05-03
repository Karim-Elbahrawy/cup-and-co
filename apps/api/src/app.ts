import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { OrderStatus } from '@cup-and-co/types';
import { errorHandler } from './http/errors.js';
import { requireAuth, requireAdmin, getRequestUser, getAdminRole, signSession } from './http/auth.js';
import { assertAdminPermission } from './services/permissions.js';
import { calculateDiscountEgp, calculateEarnedPoints } from './services/loyalty.js';
import { createQrReceiptService } from './services/qrReceipts.js';
import { createGameService } from './services/games.js';
import { createPaymobService } from './services/payments.js';
import { catalogRouter } from './routes/catalog.js';

// In-memory demo store for orders/payments/loyalty. Reads (catalog) come
// from Supabase if configured, otherwise from a fallback fixture in
// `db/catalogRepo.ts` so dev works with zero infra.
type DemoOrder = {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentType: 'pickup' | 'delivery';
  subtotalEgp: number;
  discountEgp: number;
  totalEgp: number;
  pointsAwarded: number;
  pointsRedeemed: number;
  pickupCode: string | null;
  createdAt: string;
  scheduledFor: string | null;
};

const orders = new Map<string, DemoOrder>();
const userPoints = new Map<string, number>();
const userProfiles = new Map<string, Record<string, unknown>>();
const pushDevices = new Map<string, Array<{ platform: 'ios' | 'web'; token: string; last_seen_at: string }>>();

const qrReceipts = createQrReceiptService();
const games = createGameService();
const paymob = createPaymobService();

// Schemas
const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(20),
  options: z.record(z.string()).default({}),
  unitPriceEgp: z.number().positive(),
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
    'received',
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled',
    'refunded',
  ]),
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

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Health
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'cup-and-co-api', time: new Date().toISOString() });
  });

  // Catalog (public reads, no auth required)
  app.use(catalogRouter());

  // -------- Auth (phone OTP) --------
  // Stub: in dev the OTP is always "000000". In Phase 1 this calls Supabase.
  app.post('/auth/otp/send', (req, res, next) => {
    try {
      const { phone } = otpSendSchema.parse(req.body);
      // TODO Phase 1: supabase.auth.signInWithOtp({ phone })
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

  // PATCH /me — update profile fields (full_name, role, language_pref,
  // biometric_enabled, university_id, major, department).
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

      // Role and verification flow into the request user too
      if (input.role) u.role = input.role;
      // Students start as 'pending' until ID approved; staff also start pending
      // unless they're already approved (dev seeded users are approved).
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

  // POST /me/verification — submit ID image (multipart in production; here we
  // accept a base64 data URL or a public URL for the dev stub).
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

  // POST /push/register — store device token for push notifications.
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

  app.post('/orders', requireAuth, (req, res, next) => {
    try {
      const user = getRequestUser(req);
      const input = createOrderSchema.parse(req.body);
      const subtotal = input.items.reduce((s, it) => s + it.quantity * it.unitPriceEgp, 0);
      const discount = Math.min(calculateDiscountEgp(input.redeemPoints), subtotal);
      const total = subtotal - discount;
      const paymentStatus = input.paymentMethod === 'cash' ? 'pending' : 'unpaid';
      const pointsAwarded =
        input.paymentMethod === 'cash'
          ? calculateEarnedPoints({ amountEgp: total, source: 'cash_in_app' })
          : calculateEarnedPoints({ amountEgp: total, source: 'online_paid' });
      const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

      const order: DemoOrder = {
        id: randomUUID(),
        userId: user.id,
        status: 'received',
        paymentStatus,
        paymentMethod: input.paymentMethod,
        fulfillmentType: input.fulfillmentType,
        subtotalEgp: subtotal,
        discountEgp: discount,
        totalEgp: total,
        pointsAwarded,
        pointsRedeemed: input.redeemPoints,
        pickupCode,
        createdAt: new Date().toISOString(),
        scheduledFor: input.scheduledFor ?? null,
      };
      orders.set(order.id, order);
      res.status(201).json({ order });
    } catch (e) { next(e); }
  });

  app.get('/orders/:id', requireAuth, (req, res, next) => {
    try {
      const order = orders.get(req.params.id);
      if (!order) throw new Error('Order not found.');
      const user = getRequestUser(req);
      if (order.userId !== user.id && user.role !== 'owner' && user.role !== 'barista') {
        throw new Error('Order not found.');
      }
      res.json({ order });
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

  app.post('/webhooks/paymob', (req, res, next) => {
    try {
      const payload = paymobCallbackSchema.parse(req.body);
      const hmac = String(req.header('x-paymob-hmac') ?? '');
      const result = paymob.handleCallback(payload, hmac);
      const order = orders.get(result.orderId);
      if (order) {
        order.paymentStatus = result.paymentStatus;
        if (result.paymentStatus === 'paid') {
          // Award online points
          const earned = calculateEarnedPoints({
            amountEgp: order.totalEgp,
            source: 'online_paid',
          });
          userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + earned);
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
      res.json({ orders: Array.from(orders.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
    } catch (e) { next(e); }
  });

  app.patch('/admin/orders/:id/status', requireAuth, requireAdmin, (req, res, next) => {
    try {
      assertAdminPermission(getAdminRole(req), 'orders:update_status');
      const { status } = updateOrderStatusSchema.parse(req.body);
      const order = orders.get(req.params.id);
      if (!order) throw new Error('Order not found.');
      order.status = status;
      // On cash 'completed', award cash points
      if (status === 'completed' && order.paymentMethod === 'cash' && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        const earned = calculateEarnedPoints({ amountEgp: order.totalEgp, source: 'cash_in_app' });
        userPoints.set(order.userId, (userPoints.get(order.userId) ?? 0) + earned);
      }
      res.json({ order });
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
        fullReportsVisible: role === 'owner',
      });
    } catch (e) { next(e); }
  });

  app.use(errorHandler);
  return app;
}
