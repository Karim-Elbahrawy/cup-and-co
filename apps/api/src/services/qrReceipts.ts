import { randomUUID } from 'node:crypto';
import { calculateEarnedPoints } from './loyalty.js';

export interface ReceiptRecord {
  token: string;
  orderTotalEgp: number;
  createdByAdminId: string;
  createdAt: Date;
  expiresAt: Date;
  claimedByUserId: string | null;
  claimedAt: Date | null;
}

export interface CreateReceiptInput {
  orderTotalEgp: number;
  createdByAdminId: string;
  ttlHours?: number;
}

export interface ClaimReceiptInput {
  receiptToken: string;
  userId: string;
  phoneVerified: boolean;
}

export interface ReceiptClaimResult {
  status: 'claimed';
  receiptToken: string;
  pointsAwarded: number;
}

export function createQrReceiptService(opts: { now?: () => Date } = {}) {
  let now = opts.now ?? (() => new Date());
  const receipts = new Map<string, ReceiptRecord>();

  return {
    setNow(fn: () => Date) {
      now = fn;
    },

    createReceipt(input: CreateReceiptInput): ReceiptRecord {
      if (!Number.isFinite(input.orderTotalEgp) || input.orderTotalEgp <= 0) {
        throw new Error('Receipt total must be greater than zero.');
      }
      const ttlMs = (input.ttlHours ?? 24) * 60 * 60 * 1000;
      const createdAt = now();
      const record: ReceiptRecord = {
        token: randomUUID(),
        orderTotalEgp: input.orderTotalEgp,
        createdByAdminId: input.createdByAdminId,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + ttlMs),
        claimedByUserId: null,
        claimedAt: null,
      };
      receipts.set(record.token, record);
      return record;
    },

    claimReceipt(input: ClaimReceiptInput): ReceiptClaimResult {
      if (!input.phoneVerified) {
        throw new Error('Phone must be verified before claiming receipt points.');
      }
      const receipt = receipts.get(input.receiptToken);
      if (!receipt) {
        throw new Error('Receipt QR token was not found.');
      }
      if (receipt.claimedByUserId) {
        throw new Error('This receipt has already been claimed.');
      }
      if (now().getTime() > receipt.expiresAt.getTime()) {
        throw new Error('This receipt has expired.');
      }
      receipt.claimedByUserId = input.userId;
      receipt.claimedAt = now();
      return {
        status: 'claimed',
        receiptToken: receipt.token,
        pointsAwarded: calculateEarnedPoints({
          amountEgp: receipt.orderTotalEgp,
          source: 'qr_receipt',
        }),
      };
    },

    listReceipts() {
      return Array.from(receipts.values());
    },
  };
}
