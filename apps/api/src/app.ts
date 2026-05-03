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

// In-memory demo store. Replaced with Supabase in Phase 1.
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
    res.json({ user: u, points: userPoints.get(u.id) ?? 0 });
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
