import { describe, expect, it } from 'vitest';
import { createPaymobService, signPaymobPayload, type PaymobCallbackPayload } from './payments.js';

describe('payments', () => {
  it('creates a payment intention with positive amount', () => {
    const svc = createPaymobService();
    const intent = svc.createIntention({
      orderId: 'ord_1',
      userId: 'usr_1',
      amountEgp: 120,
      method: 'paymob_card',
    });
    expect(intent.gateway).toBe('paymob');
    expect(intent.amountEgp).toBe(120);
    expect(intent.checkoutUrl).toContain('merchant_order_id=ord_1');
    expect(intent.checkoutUrl).toContain('method=paymob_card');
    expect(intent.gatewayReference).toMatch(/^cc_ord_1_/);
  });

  it('throws on non-positive amount', () => {
    const svc = createPaymobService();
    expect(() =>
      svc.createIntention({ orderId: 'o', userId: 'u', amountEgp: 0, method: 'paymob_card' }),
    ).toThrow();
    expect(() =>
      svc.createIntention({ orderId: 'o', userId: 'u', amountEgp: -1, method: 'paymob_card' }),
    ).toThrow();
  });

  it('verifies a valid HMAC and returns paid status on success', () => {
    const svc = createPaymobService();
    const payload: PaymobCallbackPayload = {
      orderId: 'ord_1',
      success: true,
      transactionId: 'tx_1',
      amountEgp: 120,
    };
    const hmac = signPaymobPayload(payload, 'local-dev-secret');
    const result = svc.handleCallback(payload, hmac);
    expect(result.verified).toBe(true);
    expect(result.paymentStatus).toBe('paid');
  });

  it('returns failed status when callback success=false', () => {
    const svc = createPaymobService();
    const payload: PaymobCallbackPayload = {
      orderId: 'ord_1',
      success: false,
      transactionId: 'tx_2',
      amountEgp: 120,
    };
    const hmac = signPaymobPayload(payload, 'local-dev-secret');
    const result = svc.handleCallback(payload, hmac);
    expect(result.paymentStatus).toBe('failed');
  });

  it('rejects an invalid HMAC', () => {
    const svc = createPaymobService();
    const payload: PaymobCallbackPayload = {
      orderId: 'ord_1',
      success: true,
      transactionId: 'tx_1',
      amountEgp: 120,
    };
    expect(() => svc.handleCallback(payload, 'a'.repeat(128))).toThrow(/HMAC/);
  });

  it('rejects a tampered payload (same hmac, mutated body)', () => {
    const svc = createPaymobService();
    const payload: PaymobCallbackPayload = {
      orderId: 'ord_1',
      success: true,
      transactionId: 'tx_1',
      amountEgp: 120,
    };
    const hmac = signPaymobPayload(payload, 'local-dev-secret');
    const tampered = { ...payload, amountEgp: 1 };
    expect(() => svc.handleCallback(tampered, hmac)).toThrow(/HMAC/);
  });
});
