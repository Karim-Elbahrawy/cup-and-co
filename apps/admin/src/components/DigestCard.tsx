'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import { adminApi, type AdminDigestConfig, type AdminDigestPreview } from '@/lib/api';

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DigestCard() {
  const [config, setConfig] = useState<AdminDigestConfig | null>(null);
  const [preview, setPreview] = useState<AdminDigestPreview | null>(null);
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    const [cfg, pv] = await Promise.all([
      adminApi.getDigestConfig(),
      adminApi.getDigestPreview(),
    ]);
    setConfig(cfg);
    setPreview(pv);
    setRecipientsRaw((cfg.recipients ?? []).join(', '));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const recipients = recipientsRaw.split(',').map(s => s.trim()).filter(Boolean);
      await adminApi.setDigestConfig({ ...config, recipients });
      load();
    } finally {
      setSaving(false);
    }
  }

  if (!config) return null;

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Mail className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Weekly digest
        </h2>
        <span className="text-xs text-cup-muted">Email summary</span>
        <button
          type="button"
          onClick={() => setShowPreview(s => !s)}
          className="ml-auto inline-flex items-center gap-1 rounded-pill border border-cup-stroke bg-white px-2.5 py-1 text-[11px] font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
        >
          <Eye className="h-3 w-3" />
          {showPreview ? 'Hide preview' : 'Preview digest'}
        </button>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <label className="flex items-center gap-2 rounded-chip border border-cup-stroke bg-cup-cream-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={e => setConfig({ ...config, enabled: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-xs font-semibold text-cup-brown-900">Enabled</span>
        </label>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Day of week</label>
          <select
            value={config.dayOfWeek}
            onChange={e => setConfig({ ...config, dayOfWeek: Number(e.target.value) })}
            className="w-full rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none"
          >
            {DOW_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Hour (24h)</label>
          <input
            type="number"
            min={0}
            max={23}
            value={config.hour}
            onChange={e => setConfig({ ...config, hour: Number(e.target.value) })}
            className="w-full rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Recipients (comma-separated)</label>
          <input
            type="text"
            value={recipientsRaw}
            onChange={e => setRecipientsRaw(e.target.value)}
            placeholder="owner@cupandco.com, gm@cupandco.com"
            className="w-full rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-cup-muted">
          {config.enabled
            ? `Scheduled: every ${DOW_LABELS[config.dayOfWeek]} at ${String(config.hour).padStart(2, '0')}:00`
            : 'Digest is disabled. Toggle Enabled to schedule weekly emails.'}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-pill bg-cup-brown-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cup-brown-800 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {showPreview && preview && (
        <div className="mt-5 rounded-chip border border-cup-stroke bg-cup-cream-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">
            Preview · {preview.period.from} to {preview.period.to}
          </p>
          <h3 className="mt-1 font-heading text-lg font-bold text-cup-brown-900">Weekly recap</h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <PreviewStat label="Revenue" value={formatEgp(preview.summary.revenue)} delta={preview.deltaVsLastWeek.revenue} />
            <PreviewStat label="Orders" value={String(preview.summary.orders)} delta={preview.deltaVsLastWeek.orders} />
            <PreviewStat label="Customers" value={String(preview.summary.customers)} />
            <PreviewStat label="AOV" value={formatEgp(preview.summary.aov)} />
          </div>

          {preview.topProducts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase text-cup-muted">Top sellers this week</p>
              <div className="space-y-1">
                {preview.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded border border-cup-stroke bg-white px-3 py-1.5">
                    <span className="text-xs font-medium text-cup-brown-900">#{i + 1} {p.name}</span>
                    <span className="text-xs text-cup-muted">{p.qty} sold · {formatEgp(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-3 text-[10px] text-cup-muted">{preview.nextScheduled}</p>
        </div>
      )}
    </section>
  );
}

function PreviewStat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="rounded border border-cup-stroke bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">{label}</p>
      <p className="mt-0.5 font-heading text-base font-bold text-cup-brown-900">{value}</p>
      {delta !== undefined && delta !== 0 && (
        <p className={`flex items-center gap-0.5 text-[10px] font-bold ${delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {delta > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {delta > 0 ? '+' : ''}{delta}% vs last week
        </p>
      )}
    </div>
  );
}
