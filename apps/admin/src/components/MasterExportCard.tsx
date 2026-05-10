'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { adminApi } from '@/lib/api';

interface Props {
  dateRange?: { from?: string; to?: string };
}

const SECTIONS = [
  { key: 'orders', label: 'All orders', desc: 'Every order with line items, status, totals' },
  { key: 'revenue-daily', label: 'Daily revenue', desc: 'Revenue + order count per day' },
  { key: 'customers', label: 'Customer ledger', desc: 'Per-customer revenue, orders, first-order date' },
];

export function MasterExportCard({ dateRange }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadSection(section: string) {
    setExporting(section);
    setError(null);
    try {
      const filename = await adminApi.exportCsv(section, dateRange?.from, dateRange?.to);
      if (filename === null) {
        setError('No data in this date range.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Bulk data export
        </h2>
        <span className="text-xs text-cup-muted">CSV — full datasets</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => downloadSection(s.key)}
            disabled={exporting !== null}
            className="flex flex-col items-start gap-1 rounded-chip border border-cup-stroke bg-cup-cream-50 p-4 text-left transition hover:border-cup-orange-400 hover:bg-cup-cream-100 disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5 text-cup-orange-600" />
              <span className="font-heading text-sm font-bold text-cup-brown-900">{s.label}</span>
            </div>
            <p className="text-[11px] text-cup-muted">{s.desc}</p>
            {exporting === s.key && (
              <span className="text-[10px] font-semibold text-cup-orange-600">Downloading…</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
    </section>
  );
}
