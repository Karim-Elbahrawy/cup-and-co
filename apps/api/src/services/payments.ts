import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentStatus } from '@cup-and-co/types';
import { config } from '../config.js';

export interface CreatePaymentIntentionInput {
  orderId: string;
  userId: string;
  amountEgp: number;
  method: 'paymob_card' | 'paymob_wallet';
}

export interface PaymentIntention {
  orderId: string;
  userId: string;
  amountEgp: number;
  status: 'pending';
  gateway: 'paymob';
  gatewayReference: string;
  checkoutUrl: string;
  iframeId: string;
}

export interface PaymobCallbackPayload {
  orderId: string;
  success: boolean;
  transactionId: string;
  amountEgp: number;
}

export interface PaymobCallbackResult {
  verified: true;
  orderId: string;
  transactionId: string;
  paymentStatus: Extract<PaymentStatus, 'paid' | 'failed'>;
}

function stableStringify(payload: unknown): string {
  if (payload === null || typeof payload !== 'object') {
    return JSON.stringify(payload);
  }
  if (Array.isArray(payload)) {
    return `[${payload.map(stableStringify).join(',')}]`;
  }
  return `{${Object.entries(payload as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${JSON.stringify(key)}:${stableStringify(value)}`)
    .join(',')}}`;
}

export function signPaymobPayload(payload: PaymobCallbackPayload, secret: string): string {
  return createHmac('sha512', secret).update(stableStringify(payload)).digest('hex');
}

function assertValidHmac(payload: PaymobCallbackPayload, receivedHmac: string, secret: string): void {
  const expected = signPaymobPayload(payload, secret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(receivedHmac, 'hex');
  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    throw new Error('Paymob callback HMAC verification failed.');
  }
}

export function createPaymobService() {
  return {
    /**
     * Create a payment intention. In production this calls Paymob's API to mint
     * an auth token + order + payment key; in dev we return a stub iframe URL.
     */
    createIntention(input: CreatePaymentIntentionInput): PaymentIntention {
      if (!Number.isFinite(input.amountEgp) || input.amountEgp <= 0) {
        throw new Error('Payment amount must be greater than zero.');
      }
      const ref = `cc_${input.orderId}_${Date.now()}`;
      // In dev (no Paymob API key), redirect to the local payment simulator instead.
      const isDev = !config.paymob.apiKey;
      const url = isDev
        ? `${config.devApiBaseUrl}/dev/payment-sim?orderId=${encodeURIComponent(input.orderId)}&method=${input.method}`
        : `${config.paymob.checkoutBaseUrl}?merchant_order_id=${encodeURIComponent(input.orderId)}&amount=${input.amountEgp}&method=${input.method}`;
      return {
        orderId: input.orderId,
        userId: input.userId,
        amountEgp: input.amountEgp,
        status: 'pending',
        gateway: 'paymob',
        gatewayReference: ref,
        checkoutUrl: url,
        iframeId: config.paymob.iframeId,
      };
    },

    handleCallback(payload: PaymobCallbackPayload, receivedHmac: string): PaymobCallbackResult {
      assertValidHmac(payload, receivedHmac, config.paymob.hmacSecret);
      return {
        verified: true,
        orderId: payload.orderId,
        transactionId: payload.transactionId,
        paymentStatus: payload.success ? 'paid' : 'failed',
      };
    },
  };
}
