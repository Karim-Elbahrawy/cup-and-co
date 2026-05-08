'use client';

/**
 * Cup AI usage tile for the admin reports page.
 *
 * Answers two questions for an owner:
 *   1. Are people using the concierge? (totalQueries, language split)
 *   2. When they use it, are they getting decent answers?
 *      (confidence breakdown + the actual low-confidence queries to review)
 *
 * Low-confidence queries are the matcher's blind-spots — the admin can read
 * them and decide whether to add tags to a product, edit a description, or
 * eventually justify wiring an LLM layer.
 *
 * Self-fetches; just drop <CupAiUsageTile /> into the reports page.
 */

import { useEffect, useState } from 'react';
import { Sparkles, Languages, Loader2 } from 'lucide-react';
import { adminApi, type CupAiStatsResponse } from '@/lib/api';
import { useToast } from '@/components/Toast';

const WINDOW_OPTIONS = [
  { days: 1,  label: '24h' },
  { days: 7,  label: '7 days' },
  { days: 30, label: '30 days' },
];

export function CupAiUsageTile() {
  const toast = useToast();
  const [stats, setStats] = useState<CupAiStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi.getCupAiStats(days)
      .then((res) => { if (!cancelled) setStats(res); })
      .catch((err) => { if (!cancelled) toast('error', (err as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, toast]);

  const lowConfPct = stats && stats.totalQueries > 0
    ? Math.round((stats.byConfidence.low / stats.totalQueries) * 100)
    : 0;
  const zeroPct = stats && stats.totalQueries > 0
    ? Math.round((stats.zeroMatchCount / stats.totalQueries) * 100)
    : 0;
  const arabicPct = stats && stats.totalQueries > 0
    ? Math.round((stats.byLanguage.ar / stats.totalQueries) * 100)
    : 0;

  return (
    <section
      aria-labelledby="cup-ai-tile-heading"
      className="overflow-hidden rounded-card border border-cup-stroke bg-gradient-to-br from-amber-50 via-white to-cup-cream-100 shadow-sm"
    >
      <header className="flex items-center justify-between gap-3 border-b border-cup-stroke/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-cup-orange-600 text-white">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <h2 id="cup-ai-tile-heading" className="font-heading text-sm font-bold text-cup-brown-900">
              Cup AI usage
            </h2>
            <p className="text-[11px] text-cup-muted">Concierge queries &amp; matcher confidence</p>
          </div>
        </div>
        <div role="tablist" aria-label="Time window" className="flex items-center gap-1 rounded-pill border border-cup-stroke bg-white p-0.5">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              role="tab"
              aria-selected={days === opt.days}
              onClick={() => setDays(opt.days)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                days === opt.days
                  ? 'bg-cup-orange-600 text-white shadow-sm'
                  : 'text-cup-muted hover:text-cup-brown-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {loading || !stats ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-xs text-cup-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading Cup AI stats…
        </div>
      ) : stats.totalQueries === 0 ? (
        <div className="px-5 py-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-cup-stroke" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-cup-brown-900">No Cup AI activity yet</p>
          <p className="mt-1 text-xs text-cup-muted">
            Queries will appear here once customers use the sparkle button on the home screen.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 px-5 py-4 lg:grid-cols-2">
          {/* Headline metrics */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Queries" value={stats.totalQueries.toLocaleString()} tone="orange" />
              <Metric
                label="Low conf."
                value={`${lowConfPct}%`}
                hint={`${stats.byConfidence.low} of ${stats.totalQueries}`}
                tone={lowConfPct > 30 ? 'rose' : 'muted'}
              />
              <Metric
                label="No matches"
                value={`${zeroPct}%`}
                hint={`${stats.zeroMatchCount} of ${stats.totalQueries}`}
                tone={zeroPct > 10 ? 'rose' : 'muted'}
              />
            </div>

            <ConfidenceBar
              high={stats.byConfidence.high}
              medium={stats.byConfidence.medium}
              low={stats.byConfidence.low}
              total={stats.totalQueries}
            />

            <div className="flex items-center gap-2 text-xs text-cup-muted">
              <Languages className="h-3.5 w-3.5" aria-hidden />
              <span>
                <span className="font-semibold text-cup-brown-900">{arabicPct}%</span> Arabic
                <span className="mx-1.5 text-cup-stroke">·</span>
                <span className="font-semibold text-cup-brown-900">{100 - arabicPct}%</span> English
              </span>
            </div>
          </div>

          {/* Top queries lists */}
          <div className="space-y-3">
            <QueryList
              title="Top queries"
              items={stats.topQueries}
              emptyHint="No queries in this window."
            />
            {stats.topLowConfidenceQueries.length > 0 && (
              <QueryList
                title="Blind-spots (low confidence)"
                titleHint="Consider adding tags or descriptions to cover these."
                items={stats.topLowConfidenceQueries}
                tone="rose"
              />
            )}
          </div>

          {/* Top suggested products — full-width row */}
          {stats.topProducts.length > 0 && (
            <div className="lg:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cup-muted">
                Most suggested products
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {stats.topProducts.map((p) => (
                  <span
                    key={p.productId}
                    className="flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-2.5 py-0.5 text-[11px]"
                  >
                    <span className="font-semibold text-cup-brown-900">{p.name_en}</span>
                    <span className="rounded-full bg-cup-orange-100 px-1.5 text-[10px] font-bold text-cup-orange-700">
                      ×{p.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function Metric({
  label, value, hint, tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: 'orange' | 'rose' | 'muted';
}) {
  const valueClass = tone === 'orange' ? 'text-cup-orange-700' : tone === 'rose' ? 'text-rose-700' : 'text-cup-brown-900';
  return (
    <div className="rounded-lg border border-cup-stroke bg-white p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cup-muted">{label}</p>
      <p className={`mt-0.5 font-heading text-lg font-bold leading-none ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[10px] text-cup-muted">{hint}</p>}
    </div>
  );
}

function ConfidenceBar({ high, medium, low, total }: { high: number; medium: number; low: number; total: number }) {
  if (total === 0) return null;
  const hi = (high / total) * 100;
  const md = (medium / total) * 100;
  const lo = (low / total) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-cup-muted">
        <span>Confidence</span>
        <span className="space-x-2 font-mono normal-case tracking-normal">
          <span className="text-emerald-700">●{high}</span>
          <span className="text-amber-700">●{medium}</span>
          <span className="text-rose-700">●{low}</span>
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-cup-cream-100">
        <div className="bg-emerald-500" style={{ width: `${hi}%` }} aria-label={`${high} high confidence`} />
        <div className="bg-amber-500"   style={{ width: `${md}%` }} aria-label={`${medium} medium confidence`} />
        <div className="bg-rose-500"    style={{ width: `${lo}%` }} aria-label={`${low} low confidence`} />
      </div>
    </div>
  );
}

function QueryList({
  title, titleHint, items, emptyHint, tone,
}: {
  title: string;
  titleHint?: string;
  items: Array<{ query: string; count: number }>;
  emptyHint?: string;
  tone?: 'rose';
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-cup-muted">{title}</p>
      {titleHint && <p className="text-[10px] italic text-cup-muted">{titleHint}</p>}
      {items.length === 0 ? (
        <p className="mt-1.5 rounded-md border border-dashed border-cup-stroke px-2 py-1.5 text-[11px] text-cup-muted">
          {emptyHint ?? '—'}
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {items.slice(0, 5).map((q) => (
            <li
              key={q.query}
              className="flex items-center justify-between rounded-md border border-cup-stroke bg-white px-2 py-1 text-xs"
            >
              <span className="truncate" dir="auto">{q.query}</span>
              <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-bold ${
                tone === 'rose' ? 'bg-rose-100 text-rose-700' : 'bg-cup-cream-100 text-cup-brown-700'
              }`}>
                ×{q.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
