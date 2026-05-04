'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Gift,
  QrCode,
  ShoppingBag,
  Banknote,
  ScanLine,
  ArrowDownLeft,
  Gamepad2,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { LoyaltyEntry, LoyaltyHistoryResponse } from '@/lib/types';
import { QRScanner } from './QRScanner';

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Gift; color: string }> = {
  online_paid: { label: 'Online Order', icon: ShoppingBag, color: 'text-cup-teal-600' },
  cash_in_app: { label: 'Cash Order', icon: Banknote, color: 'text-cup-brown-700' },
  qr_receipt: { label: 'QR Receipt', icon: ScanLine, color: 'text-cup-orange-600' },
  redeemed: { label: 'Redeemed', icon: ArrowDownLeft, color: 'text-cup-error' },
  game_reward: { label: 'Game Reward', icon: Gamepad2, color: 'text-purple-600' },
};

function getSourceConfig(source: string) {
  return SOURCE_CONFIG[source] ?? { label: source, icon: Gift, color: 'text-cup-muted' };
}

export default function RewardsPage() {
  const { t } = useT();
  const [data, setData] = useState<LoyaltyHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await api.loyaltyHistory();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load rewards');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleScanSuccess(_points: number) {
    // Refresh data after successful scan (with slight delay for backend to settle)
    setTimeout(refresh, 500);
  }

  return (
    <main className="min-h-screen bg-cup-paper pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cup-paper/85 px-5 py-4 backdrop-blur-sm">
        <Link
          href="/"
          aria-label={t('common.back')}
          className="grid h-10 w-10 place-items-center rounded-full border border-cup-stroke bg-white shadow-subtle"
        >
          <ChevronLeft className="h-5 w-5 text-cup-brown-900" />
        </Link>
        <p className="font-heading text-base font-semibold text-cup-brown-900">
          Rewards
        </p>
        <span className="w-10" aria-hidden="true" />
      </header>

      {/* Error state */}
      {error && !data && (
        <div className="mx-auto max-w-md px-5 pt-4">
          <div className="rounded-2xl border border-cup-error bg-white p-6 text-center text-cup-error">
            <p className="font-semibold">{t('common.error')}</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {!data && !error && (
        <div className="mx-auto max-w-md space-y-4 px-5 pt-4">
          <div className="h-40 animate-pulse rounded-2xl bg-cup-stroke" />
          <div className="h-14 animate-pulse rounded-2xl bg-cup-stroke" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-cup-stroke" />
            ))}
          </div>
        </div>
      )}

      {data && (
        <div className="mx-auto max-w-md px-5 pt-2">
          {/* Points balance hero */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="overflow-hidden rounded-2xl bg-gradient-to-br from-cup-orange-500 to-cup-orange-600 p-6 text-white shadow-elevated"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  Your Points
                </p>
                <p className="mt-1 font-heading text-[56px] font-bold leading-none">
                  {data.balance}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-sm font-medium text-white/90">
                Discount available:{' '}
                <span className="font-heading font-bold text-white">
                  EGP {data.discountAvailableEgp}
                </span>
              </p>
            </div>
          </motion.section>

          {/* QR Scan button */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.06 }}
            className="mt-4"
          >
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-cup-stroke bg-white p-4 shadow-subtle transition active:scale-[0.98]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-cup-orange-500/10">
                <QrCode className="h-5 w-5 text-cup-orange-600" />
              </span>
              <div className="flex-1 text-left">
                <p className="font-heading text-sm font-semibold text-cup-brown-900">
                  Scan Receipt QR
                </p>
                <p className="text-xs text-cup-muted">
                  Earn points from in-store purchases
                </p>
              </div>
            </button>
          </motion.section>

          {/* Points history */}
          <section className="mt-6">
            <h2 className="font-heading text-base font-bold text-cup-brown-900">
              Points History
            </h2>

            {data.history.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-2xl border border-cup-stroke bg-white p-8 text-center shadow-subtle"
              >
                <Gift className="mx-auto h-10 w-10 text-cup-muted" />
                <p className="mt-3 font-heading text-sm font-semibold text-cup-brown-900">
                  No points yet
                </p>
                <p className="mt-1 text-xs text-cup-muted">
                  Place an order or scan a receipt QR to start earning points.
                </p>
              </motion.div>
            ) : (
              <motion.ul
                className="mt-3 space-y-2"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.04 } },
                }}
              >
                {data.history.map((entry) => (
                  <HistoryItem key={entry.id} entry={entry} />
                ))}
              </motion.ul>
            )}
          </section>
        </div>
      )}

      {/* QR Scanner modal */}
      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSuccess={handleScanSuccess}
      />
    </main>
  );
}

function HistoryItem({ entry }: { entry: LoyaltyEntry }) {
  const config = getSourceConfig(entry.source);
  const Icon = config.icon;
  const isPositive = entry.points > 0;

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="flex items-center gap-3 rounded-2xl border border-cup-stroke bg-white p-4 shadow-subtle"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cup-paper ${config.color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-heading text-sm font-semibold text-cup-brown-900">
          {config.label}
        </p>
        <p className="text-[11px] text-cup-muted">
          {new Date(entry.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          {' '}
          {new Date(entry.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`font-heading text-sm font-bold ${
            isPositive ? 'text-cup-teal-600' : 'text-cup-error'
          }`}
        >
          {isPositive ? '+' : ''}{entry.points}
        </p>
        <p className="text-[10px] text-cup-muted">bal {entry.balanceAfter}</p>
      </div>
    </motion.li>
  );
}
