'use client';

import { useState } from 'react';
import { Printer, RotateCcw } from 'lucide-react';
import { QrCanvas } from '@/components/QrCanvas';
import { adminApi, ApiError, type AdminQrReceipt } from '@/lib/api';
import { formatEgp } from '@/lib/format';
import { useSession } from '@/lib/useSession';
import { can } from '@/lib/permissions';

/**
 * QR receipt generator. Operator types in the order total in EGP, hits
 * generate, and we POST to `/admin/qr-receipts`. The token comes back and we
 * encode it into a printable QR. Customers scan it from the customer app to
 * claim loyalty points (cash-flow tier).
 */
export default function QrReceiptsPage() {
  const session = useSession();
  const allowed = can(session?.role, 'qr_receipts:create');
  const [total, setTotal] = useState('');
  const [receipt, setReceipt] = useState<AdminQrReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const value = Number(total);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an order total greater than zero.');
      return;
    }
    setPending(true);
    try {
      const created = await adminApi.createQrReceipt(value);
      setReceipt(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create receipt.');
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setReceipt(null);
    setTotal('');
    setError(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
          Loyalty
        </p>
        <h1 className="font-heading text-3xl font-bold text-cup-brown-900">QR Receipts</h1>
        <p className="mt-1 text-sm text-cup-muted">
          Print a QR for cash customers — they scan it in the Cup &amp; Co app to
          claim loyalty points.
        </p>
      </header>

      {!allowed && (
        <p
          role="alert"
          className="rounded-chip border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error"
        >
          Your role can&apos;t generate receipts.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <section className="rounded-card border border-cup-stroke bg-cup-surface p-6 shadow-card print:hidden">
          <h2 className="font-heading text-lg font-semibold text-cup-brown-900">New receipt</h2>
          <p className="text-sm text-cup-muted">
            Type the cash total. Points are calculated server-side at the QR rate.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">
                Order total (EGP)
              </span>
              <input
                inputMode="decimal"
                pattern="[0-9]*"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                disabled={!allowed || pending}
                placeholder="e.g. 75"
                className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2.5 text-base focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 disabled:bg-cup-cream-100"
                aria-label="Order total in EGP"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-chip bg-rose-50 px-3 py-2 text-sm text-cup-error"
              >
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!allowed || pending}
                className="inline-flex items-center justify-center rounded-pill bg-cup-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Generating…' : 'Generate QR'}
              </button>
              {receipt && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-pill border border-cup-stroke bg-white px-4 py-2 text-sm font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  New receipt
                </button>
              )}
            </div>
          </form>
        </section>

        <aside
          aria-live="polite"
          className="rounded-card border border-cup-stroke bg-cup-paper p-6 print:border-0 print:bg-white print:p-0"
        >
          {receipt ? (
            <ReceiptPreview receipt={receipt} />
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-cup-muted">
              <div>
                <div className="mx-auto h-32 w-32 rounded-card border-2 border-dashed border-cup-stroke" />
                <p className="mt-4">QR appears here once generated.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ReceiptPreview({ receipt }: { receipt: AdminQrReceipt }) {
  const expires = new Date(receipt.expiresAt);
  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-cup-orange-700">
        Cup &amp; Co
      </p>
      <p className="mt-0.5 text-xs text-cup-muted">Scan in app to earn points</p>

      <div className="mt-4">
        <QrCanvas value={receipt.token} caption={receipt.token.slice(0, 8).toUpperCase()} />
      </div>

      <dl className="mt-4 grid w-full grid-cols-2 gap-y-1 text-left text-xs">
        <dt className="text-cup-muted">Receipt total</dt>
        <dd className="text-right font-mono font-semibold text-cup-brown-900">
          {formatEgp(receipt.orderTotalEgp)}
        </dd>
        <dt className="text-cup-muted">Expires</dt>
        <dd className="text-right text-cup-brown-900">
          {expires.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </dd>
      </dl>

      <button
        type="button"
        onClick={() => window.print()}
        className="mt-5 inline-flex items-center gap-2 rounded-pill bg-cup-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-teal-700 focus-visible:ring-offset-2 print:hidden"
      >
        <Printer className="h-4 w-4" aria-hidden />
        Print receipt
      </button>
    </div>
  );
}
