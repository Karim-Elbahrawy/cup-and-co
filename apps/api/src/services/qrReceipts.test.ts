import { describe, expect, it } from 'vitest';
import { createQrReceiptService } from './qrReceipts.js';

describe('qrReceipts', () => {
  it('creates a receipt with a unique token', () => {
    const svc = createQrReceiptService();
    const r = svc.createReceipt({ orderTotalEgp: 50, createdByAdminId: 'admin1' });
    expect(r.token).toBeTruthy();
    expect(r.orderTotalEgp).toBe(50);
    expect(r.claimedByUserId).toBeNull();
  });

  it('rejects non-positive totals', () => {
    const svc = createQrReceiptService();
    expect(() => svc.createReceipt({ orderTotalEgp: 0, createdByAdminId: 'a' })).toThrow();
    expect(() => svc.createReceipt({ orderTotalEgp: -5, createdByAdminId: 'a' })).toThrow();
  });

  it('claims a receipt and returns awarded points', () => {
    const svc = createQrReceiptService();
    const r = svc.createReceipt({ orderTotalEgp: 100, createdByAdminId: 'admin' });
    const result = svc.claimReceipt({
      receiptToken: r.token,
      userId: 'user1',
      phoneVerified: true,
    });
    expect(result.status).toBe('claimed');
    // qr_receipt source = 0.25x, so 100 EGP = 25 points
    expect(result.pointsAwarded).toBe(25);
  });

  it('rejects unverified phone', () => {
    const svc = createQrReceiptService();
    const r = svc.createReceipt({ orderTotalEgp: 100, createdByAdminId: 'admin' });
    expect(() =>
      svc.claimReceipt({ receiptToken: r.token, userId: 'u', phoneVerified: false }),
    ).toThrow(/verified/);
  });

  it('rejects double-claim', () => {
    const svc = createQrReceiptService();
    const r = svc.createReceipt({ orderTotalEgp: 100, createdByAdminId: 'admin' });
    svc.claimReceipt({ receiptToken: r.token, userId: 'user1', phoneVerified: true });
    expect(() =>
      svc.claimReceipt({ receiptToken: r.token, userId: 'user2', phoneVerified: true }),
    ).toThrow(/already/);
  });

  it('rejects invalid token', () => {
    const svc = createQrReceiptService();
    expect(() =>
      svc.claimReceipt({ receiptToken: 'fake', userId: 'u', phoneVerified: true }),
    ).toThrow(/not found/);
  });

  it('rejects expired receipts', () => {
    let now = new Date('2026-05-04T10:00:00Z');
    const svc = createQrReceiptService({ now: () => now });
    const r = svc.createReceipt({ orderTotalEgp: 100, createdByAdminId: 'admin', ttlHours: 1 });
    now = new Date('2026-05-04T12:00:00Z'); // past expiry
    expect(() =>
      svc.claimReceipt({ receiptToken: r.token, userId: 'u', phoneVerified: true }),
    ).toThrow(/expired/);
  });
});
