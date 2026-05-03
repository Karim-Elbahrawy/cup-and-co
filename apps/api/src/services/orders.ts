import type { OrderStatus, FulfillmentType, PaymentMethod, PaymentStatus } from '@cup-and-co/types';
import { randomUUID } from 'node:crypto';

export interface OrderItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  imageUrl: string;
  quantity: number;
  options: Record<string, string>;
  unitPriceEgp: number;
  lineTotalEgp: number;
}

export interface StatusEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalEgp: number;
  discountEgp: number;
  pointsRedeemed: number;
  totalEgp: number;
  pointsAwarded: number;
  pickupCode: string | null;
  scheduledFor: string | null;
  notes: string | null;
  items: OrderItem[];
  statusHistory: StatusEvent[];
  createdAt: string;
  pickedUpAt: string | null;
}

export interface CreateOrderInput {
  userId: string;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  scheduledFor?: string | null;
  notes?: string | null;
  redeemPoints: number;
  items: Array<{
    productId: string;
    productNameEn: string;
    productNameAr: string;
    imageUrl: string;
    quantity: number;
    options: Record<string, string>;
    unitPriceEgp: number;
  }>;
}

const ORDER_STATUS_GRAPH: Record<OrderStatus, OrderStatus[]> = {
  received: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed', 'cancelled'],
  out_for_delivery: ['completed', 'cancelled'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_GRAPH[from]?.includes(to) ?? false;
}

export function generatePickupCode(): string {
  // 4-digit, friendly to read aloud (avoid 0/O confusion: drop leading zeros).
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function buildOrder(input: CreateOrderInput, opts: {
  discountEgp: number;
  pointsAwarded: number;
}): Order {
  const items: OrderItem[] = input.items.map((item) => ({
    productId: item.productId,
    productNameEn: item.productNameEn,
    productNameAr: item.productNameAr,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    options: item.options,
    unitPriceEgp: item.unitPriceEgp,
    lineTotalEgp: item.unitPriceEgp * item.quantity,
  }));

  const subtotal = items.reduce((s, it) => s + it.lineTotalEgp, 0);
  const total = Math.max(0, subtotal - opts.discountEgp);
  const now = new Date().toISOString();

  const paymentStatus: PaymentStatus =
    input.paymentMethod === 'cash' ? 'pending' : 'unpaid';

  return {
    id: randomUUID(),
    userId: input.userId,
    status: 'received',
    fulfillmentType: input.fulfillmentType,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    subtotalEgp: subtotal,
    discountEgp: opts.discountEgp,
    pointsRedeemed: input.redeemPoints,
    totalEgp: total,
    pointsAwarded: opts.pointsAwarded,
    pickupCode: generatePickupCode(),
    scheduledFor: input.scheduledFor ?? null,
    notes: input.notes ?? null,
    items,
    statusHistory: [{ status: 'received', at: now }],
    createdAt: now,
    pickedUpAt: null,
  };
}

/**
 * Mutate `order` to the new status with validation + history append.
 * Returns false if the transition is not allowed.
 */
export function applyStatusTransition(
  order: Order,
  to: OrderStatus,
  note?: string,
): boolean {
  if (order.status === to) return true; // idempotent
  if (!canTransitionTo(order.status, to)) return false;
  order.status = to;
  order.statusHistory.push({ status: to, at: new Date().toISOString(), note });
  if (to === 'completed') order.pickedUpAt = new Date().toISOString();
  return true;
}

export function trackingTimelineFor(order: Order): Array<{
  status: OrderStatus;
  label: string;
  at: string | null;
  active: boolean;
  done: boolean;
}> {
  const happyPath: OrderStatus[] =
    order.fulfillmentType === 'delivery'
      ? ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed']
      : ['received', 'accepted', 'preparing', 'ready', 'completed'];

  const labels: Record<OrderStatus, string> = {
    received: 'Order received',
    accepted: 'Accepted',
    preparing: 'Preparing',
    ready: 'Ready for pickup',
    out_for_delivery: 'On the way',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };

  const reachedAt: Partial<Record<OrderStatus, string>> = {};
  for (const ev of order.statusHistory) {
    reachedAt[ev.status] = ev.at;
  }

  // If terminal-cancelled, return what we have so far + cancelled marker.
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return [
      ...happyPath
        .filter((s) => reachedAt[s])
        .map((s) => ({
          status: s,
          label: labels[s],
          at: reachedAt[s] ?? null,
          active: false,
          done: true,
        })),
      {
        status: order.status,
        label: labels[order.status],
        at: reachedAt[order.status] ?? null,
        active: true,
        done: true,
      },
    ];
  }

  return happyPath.map((s) => ({
    status: s,
    label: labels[s],
    at: reachedAt[s] ?? null,
    active: order.status === s,
    done: !!reachedAt[s] && order.status !== s,
  }));
}
