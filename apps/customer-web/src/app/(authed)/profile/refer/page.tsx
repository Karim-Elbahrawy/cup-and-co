'use client';

/**
 * Refer-a-friend page — Phase 7.1 of UPGRADE-PLAN.md.
 *
 * Shows the user's referral code, share buttons, current rewards
 * config, and a small stats panel + recent referrals list. Sharing
 * uses the native Web Share API on mobile, falls back to copy-to-
 * clipboard on desktop.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Copy, Check, Gift, Users, Flame } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';

interface ReferralData {
  code: string;
  stats: { totalClicks: number; totalSignups: number; totalConversions: number; totalPointsEarned: number };
  recent: Array<{
    id: string;
    status: 'pending' | 'signed_up' | 'converted' | 'rejected';
    refClickedAt: string;
    signedUpAt: string | null;
    convertedAt: string | null;
    referrerReward: number | null;
  }>;
  shareLinkPath: string;
  rewards: { referrer: number; referee: number; minOrderEgp: number };
}

export default function ReferPage() {
  const { t, language } = useT();
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .myReferral()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--cup-paper)] text-sm text-[var(--cup-muted)]">
        {t('common.loading')}
      </div>
    );
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cupandco.app';
  const shareUrl = `${baseUrl}${data.shareLinkPath}`;

  const shareText = language === 'ar'
    ? `جرّب Cup & Co — احصل على ${data.rewards.referee} نقاط عند أول طلب! اشترك بكودي: ${data.code}\n${shareUrl}`
    : `Try Cup & Co — get ${data.rewards.referee} pts on your first order! Use my code: ${data.code}\n${shareUrl}`;

  async function handleShare() {
    if (typeof navigator === 'undefined') return;
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: 'Cup & Co',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled — no-op
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — show the URL inline so user can manually select
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--cup-paper)] px-4 pb-24 pt-6">
        <div className="mx-auto max-w-xl space-y-5">
          <header className="flex items-center justify-between">
            <Link
              href="/profile"
              aria-label={t('common.back')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-subtle text-[var(--cup-cocoa)]"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <h1 className="font-heading text-lg font-bold text-[var(--cup-espresso)]">
              {language === 'ar' ? 'ادعُ صديق' : 'Refer a friend'}
            </h1>
            <span className="h-10 w-10" aria-hidden="true" />
          </header>

          {/* Hero — code + reward */}
          <section className="rounded-card bg-[linear-gradient(135deg,var(--cup-primary),var(--cup-primary-hover))] p-6 text-white shadow-elevated">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
              <Gift size={12} aria-hidden="true" />
              {language === 'ar' ? 'مكافأة لك ولصديقك' : 'You both win'}
            </div>
            <p className="mt-2 font-heading text-2xl font-bold leading-tight">
              {language === 'ar'
                ? `اكسب ${data.rewards.referrer} نقطة لكل صديق ينضم لك`
                : `Earn ${data.rewards.referrer} pts for every friend who joins`}
            </p>
            <p className="mt-1 text-sm text-white/85">
              {language === 'ar'
                ? `وهم يحصلون على ${data.rewards.referee} نقطة عند أول طلب لهم.`
                : `They get ${data.rewards.referee} pts on their first order.`}
            </p>

            <div className="mt-5 rounded-2xl bg-white/14 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {language === 'ar' ? 'كودك' : 'Your code'}
              </p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-widest">{data.code}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-pill bg-white px-4 py-2.5 text-sm font-semibold text-[var(--cup-primary)] shadow-[0_6px_18px_rgba(28,25,23,0.18)] transition active:scale-[0.98]"
              >
                <Share2 size={16} aria-hidden="true" />
                {language === 'ar' ? 'مشاركة' : 'Share'}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={language === 'ar' ? 'نسخ الكود' : 'Copy code'}
                className="inline-flex items-center justify-center gap-2 rounded-pill border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied
                  ? (language === 'ar' ? 'تم' : 'Copied')
                  : (language === 'ar' ? 'نسخ' : 'Copy')}
              </button>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Users size={14} />}
              label={language === 'ar' ? 'المشتركين' : 'Signups'}
              value={data.stats.totalSignups}
            />
            <StatCard
              icon={<Flame size={14} />}
              label={language === 'ar' ? 'تحوّلات' : 'Conversions'}
              value={data.stats.totalConversions}
            />
            <StatCard
              icon={<Gift size={14} />}
              label={language === 'ar' ? 'نقاط مكسوبة' : 'Pts earned'}
              value={data.stats.totalPointsEarned}
            />
          </section>

          {/* Recent */}
          {data.recent.length > 0 && (
            <section className="rounded-card bg-white p-4 shadow-card">
              <h2 className="font-heading text-sm font-bold text-[var(--cup-espresso)]">
                {language === 'ar' ? 'الإحالات الأخيرة' : 'Recent referrals'}
              </h2>
              <ul className="mt-3 space-y-2">
                {data.recent.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--cup-paper)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--cup-espresso)]">
                        {r.status === 'converted'
                          ? (language === 'ar' ? 'تحوّل ✓' : 'Converted ✓')
                          : r.status === 'signed_up'
                            ? (language === 'ar' ? 'سجّل — انتظار أول طلب' : 'Signed up — waiting on first order')
                            : r.status === 'rejected'
                              ? (language === 'ar' ? 'مرفوض' : 'Rejected')
                              : (language === 'ar' ? 'نقرة' : 'Click')}
                      </p>
                      <p className="text-[11px] text-[var(--cup-muted)]">
                        {new Date(r.convertedAt ?? r.signedUpAt ?? r.refClickedAt).toLocaleDateString(
                          language === 'ar' ? 'ar-EG' : 'en-GB',
                          { month: 'short', day: 'numeric' },
                        )}
                      </p>
                    </div>
                    {r.referrerReward && (
                      <span className="rounded-pill bg-[var(--cup-cream)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--cup-primary)]">
                        +{r.referrerReward} ⭐
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-center text-[11px] text-[var(--cup-muted)]">
            {language === 'ar'
              ? `صديقك يحصل على ${data.rewards.referee} نقطة عند أول طلب يساوي ${data.rewards.minOrderEgp}+ ج.م.`
              : `Friend earns ${data.rewards.referee} pts on their first order ≥ ${data.rewards.minOrderEgp} EGP.`}
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-card bg-white p-3 text-center shadow-card">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cup-cream)] text-[var(--cup-primary)]">
        {icon}
      </span>
      <p className="mt-1.5 font-heading text-xl font-bold text-[var(--cup-espresso)]">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--cup-muted)]">{label}</p>
    </div>
  );
}
