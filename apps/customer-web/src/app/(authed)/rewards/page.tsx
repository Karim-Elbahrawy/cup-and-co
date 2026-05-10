'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
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
  Trophy,
  Medal,
  Ticket,
  Copy,
  Check,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';
import type {
  LeaderboardCurrentResponse,
  LeaderboardEntry,
  LeaderboardMeResponse,
  LoyaltyEntry,
  LoyaltyHistoryResponse,
  Prize,
  PrizesResponse,
} from '@/lib/types';
import { QRScanner } from './QRScanner';
import { CoffeePassCard } from '@/components/CoffeePassCard';

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
  const user = useSession((s) => s.user);
  const reduce = useReducedMotion();
  const isStudent = user?.role === 'student';

  const [data, setData] = useState<LoyaltyHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardCurrentResponse | null>(null);
  const [leaderboardMe, setLeaderboardMe] = useState<LeaderboardMeResponse | null>(null);
  const [prizes, setPrizes] = useState<PrizesResponse | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await api.loyaltyHistory();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load rewards');
    }
  }, []);

  // Load leaderboard + prizes in parallel (non-blocking — don't fail the page)
  useEffect(() => {
    void api.leaderboardCurrent().then(setLeaderboard).catch(() => null);
    void api.leaderboardMe().then(setLeaderboardMe).catch(() => null);
    void api.prizes().then(setPrizes).catch(() => null);
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
        <h1 className="font-heading text-base font-semibold text-cup-brown-900">
          {t('loyalty.rewards')}
        </h1>
        <span className="w-10" aria-hidden="true" />
      </header>

      {/* Error state */}
      {error && !data && (
        <div className="mx-auto max-w-3xl px-5 pt-4">
          <div className="rounded-2xl border border-cup-error bg-white p-6 text-center text-cup-error">
            <p className="font-semibold">{t('common.error')}</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {!data && !error && (
        <div className="mx-auto max-w-3xl space-y-4 px-5 pt-4">
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
        <div className="mx-auto max-w-3xl px-5 pt-2">
          {/* Points balance hero */}
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
            className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#F4A261] to-[#C2410C] p-6 text-white shadow-elevated"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  {t('loyalty.yourPoints')}
                </p>
                <p
                  className="mt-1 font-heading font-bold leading-none"
                  style={{ fontSize: 'clamp(2.5rem, 12vw, 3.5rem)' }}
                >
                  {data.balance}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-sm font-medium text-white/90">
                {t('loyalty.discountAvailable')}:{' '}
                <span className="font-heading font-bold text-white">
                  EGP {data.discountAvailableEgp}
                </span>
              </p>
            </div>
          </motion.section>

          {/* Coffee Pass — subscription tier card. Lives directly under the
              points balance because it's the next-tier upsell the customer
              cares about most. Self-fetches its own state. */}
          <div className="mt-4">
            <CoffeePassCard />
          </div>

          {/* Play Game button — students only */}
          {isStudent && (
            <motion.section
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24, delay: 0.04 }}
              className="mt-4"
            >
              <Link
                href="/game"
                className="flex w-full items-center gap-3 rounded-2xl border border-cup-stroke bg-white p-4 shadow-subtle transition active:scale-[0.98]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-purple-50">
                  <Gamepad2 className="h-5 w-5 text-purple-600" />
                </span>
                <div className="flex-1 text-start">
                  <p className="font-heading text-sm font-semibold text-cup-brown-900">
                    {t('games.playCoffeeCollector')}
                  </p>
                  <p className="text-xs text-cup-muted">
                    {t('games.earnPoints')}
                  </p>
                </div>
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  {t('games.play')}
                </span>
              </Link>
            </motion.section>
          )}

          {/* QR Scan button */}
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24, delay: 0.06 }}
            className="mt-3"
          >
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-cup-stroke bg-white p-4 shadow-subtle transition active:scale-[0.98]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-cup-orange-600/10">
                <QrCode className="h-5 w-5 text-cup-orange-600" />
              </span>
              <div className="flex-1 text-start">
                <p className="font-heading text-sm font-semibold text-cup-brown-900">
                  {t('loyalty.scanQr')}
                </p>
                <p className="text-xs text-cup-muted">
                  {t('loyalty.scanQrMessage')}
                </p>
              </div>
            </button>
          </motion.section>

          {/* Points history */}
          <section className="mt-6">
            <h2 className="font-heading text-base font-bold text-cup-brown-900">
              {t('loyalty.history')}
            </h2>

            {data.history.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-2xl border border-cup-stroke bg-white p-8 text-center shadow-subtle"
              >
                <Gift className="mx-auto h-10 w-10 text-cup-muted" />
                <p className="mt-3 font-heading text-sm font-semibold text-cup-brown-900">
                  {t('loyalty.noHistory')}
                </p>
                <p className="mt-1 text-xs text-cup-muted">
                  {t('loyalty.noHistoryMessage')}
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

          {/* Leaderboard */}
          <LeaderboardSection
            leaderboard={leaderboard}
            me={leaderboardMe}
            userId={user?.id}
          />

          {/* Prizes */}
          <PrizesSection prizes={prizes} />
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

// ─── HistoryItem ─────────────────────────────────────────────────────────────

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
      <div className="text-end">
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

// ─── LeaderboardSection ───────────────────────────────────────────────────────

const RANK_PRIZE: Record<number, string> = {
  1: '1st: Free combo meal',
  2: '2nd: Free drink',
  3: '3rd: 50% off',
};

function rankBadgeClass(rank: number) {
  if (rank === 1) return 'bg-yellow-400 text-yellow-900';
  if (rank === 2) return 'bg-gray-300 text-gray-800';
  if (rank === 3) return 'bg-amber-600/80 text-white';
  return 'bg-cup-paper text-cup-muted';
}

function LeaderboardSection({
  leaderboard,
  me,
  userId,
}: {
  leaderboard: LeaderboardCurrentResponse | null;
  me: LeaderboardMeResponse | null;
  userId?: string;
}) {
  const { t } = useT();
  if (!leaderboard) return null;

  const top10 = leaderboard.entries.slice(0, 10);

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-cup-orange-600" />
        <h2 className="font-heading text-base font-bold text-cup-brown-900">
          {t('games.leaderboard')}
        </h2>
      </div>

      {/* Top-3 podium */}
      {top10.length >= 3 && (
        <div className="mt-3 flex items-end justify-center gap-2 px-2">
          {[1, 0, 2].map((idx) => {
            const e = top10[idx];
            const heights = [110, 80, 65];
            const colors = ['bg-yellow-400', 'bg-gray-300', 'bg-amber-600/80'];
            const h = heights[idx];
            return (
              <div key={e.userId} className="flex flex-1 flex-col items-center">
                <p className="truncate font-heading text-xs font-semibold text-cup-brown-900" title={e.displayName ?? e.userId}>
                  {e.displayName ?? `…${e.userId.slice(-4)}`}
                </p>
                <p className="text-[10px] font-bold text-cup-muted">{e.totalScore} pts</p>
                <div
                  className={`mt-1 grid w-full place-items-center rounded-t-xl ${colors[idx]} text-white shadow-subtle`}
                  style={{ height: h }}
                >
                  <span className="font-heading text-2xl font-bold">{e.rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prize key */}
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.values(RANK_PRIZE).map((label) => (
          <span
            key={label}
            className="rounded-full border border-cup-stroke bg-white px-3 py-1 text-[11px] font-medium text-cup-muted shadow-subtle"
          >
            {label}
          </span>
        ))}
      </div>

        {top10.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-cup-stroke bg-white p-6 text-center shadow-subtle">
          <p className="text-sm text-cup-muted">{t('loyalty.noScores')}</p>
        </div>
      ) : (
        <motion.ul
          className="mt-3 space-y-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
        >
          {top10.map((entry) => {
            const isMe = entry.userId === userId;
            return (
              <motion.li
                key={entry.userId}
                variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-subtle ${
                  isMe
                    ? 'border-cup-orange-600/40 bg-cup-orange-600/5'
                    : 'border-cup-stroke bg-white'
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${rankBadgeClass(entry.rank)}`}
                >
                  {entry.rank <= 3 ? <Medal className="h-4 w-4" /> : `#${entry.rank}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-heading text-sm font-semibold text-cup-brown-900">
                    {isMe ? t('games.you') : entry.displayName ?? `…${entry.userId.slice(-6)}`}
                  </p>
                  {RANK_PRIZE[entry.rank] && (
                    <p className="text-[10px] text-cup-muted">{RANK_PRIZE[entry.rank]}</p>
                  )}
                </div>
                <span className="font-heading text-sm font-bold text-cup-brown-900">
                  {entry.totalScore} pts
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      {/* My rank if not in top 10 */}
      {me && !top10.some((e) => e.userId === userId) && (
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-cup-orange-600/40 bg-cup-orange-600/5 p-3.5 shadow-subtle">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cup-paper text-xs font-bold text-cup-muted">
            #{me.rank}
          </span>
          <p className="flex-1 font-heading text-sm font-semibold text-cup-brown-900">
            {t('games.you')}
          </p>
          <span className="font-heading text-sm font-bold text-cup-brown-900">
            {me.totalScore} pts
          </span>
        </div>
      )}
    </section>
  );
}

// ─── PrizesSection ────────────────────────────────────────────────────────────

function PrizesSection({ prizes }: { prizes: PrizesResponse | null }) {
  const { t } = useT();
  if (!prizes) return null;

  return (
    <section className="mt-8 mb-4">
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5 text-cup-orange-600" />
        <h2 className="font-heading text-base font-bold text-cup-brown-900">
          {t('games.prizes')}
        </h2>
      </div>

      {prizes.prizes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 rounded-2xl border border-cup-stroke bg-white p-8 text-center shadow-subtle"
        >
          <Ticket className="mx-auto h-10 w-10 text-cup-muted" />
          <p className="mt-3 font-heading text-sm font-semibold text-cup-brown-900">
            {t('loyalty.noPrizes')}
          </p>
          <p className="mt-1 text-xs text-cup-muted">
            {t('games.weeklyReset')}
          </p>
        </motion.div>
      ) : (
        <motion.ul
          className="mt-3 space-y-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {prizes.prizes.map((prize) => (
            <PrizeCard key={prize.id} prize={prize} />
          ))}
        </motion.ul>
      )}
    </section>
  );
}

function PrizeCard({ prize }: { prize: Prize }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(prize.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isRedeemed = Boolean(prize.redeemedAt);
  const isExpired = new Date(prize.expiresAt) < new Date();

  return (
    <motion.li
      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`rounded-2xl border p-4 shadow-subtle ${
        isRedeemed || isExpired
          ? 'border-cup-stroke bg-cup-paper opacity-60'
          : 'border-cup-orange-600/30 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cup-orange-600/10">
            <Trophy className="h-5 w-5 text-cup-orange-600" />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-cup-brown-900">
              Rank #{prize.rank} Prize
            </p>
            <p className="text-xs text-cup-muted">{prize.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {isRedeemed && (
            <span className="rounded-full bg-cup-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cup-teal-700">
              {t('loyalty.redeemed')}
            </span>
          )}
          {!isRedeemed && isExpired && (
            <span className="rounded-full bg-cup-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cup-muted">
              {t('games.expired')}
            </span>
          )}
        </div>
      </div>

      {/* Coupon code */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={isRedeemed || isExpired}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-dashed border-cup-stroke bg-cup-paper px-4 py-2.5 transition active:scale-[0.98] disabled:cursor-not-allowed"
      >
        <span className="font-mono text-sm font-bold tracking-widest text-cup-brown-900">
          {prize.code}
        </span>
        <span className="ml-3 shrink-0 text-cup-muted">
          {copied ? (
            <Check className="h-4 w-4 text-cup-teal-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </span>
      </button>

      <p className="mt-2 text-[10px] text-cup-muted">
        Expires{' '}
        {new Date(prize.expiresAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </motion.li>
  );
}
