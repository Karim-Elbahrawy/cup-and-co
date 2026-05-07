'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi, type AdminAuditEntry } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import { useToast } from '@/components/Toast';

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'order_status', label: 'Order status' },
  { value: 'review_visibility', label: 'Review visibility' },
  { value: 'user_verify', label: 'User verify' },
  { value: 'user_block', label: 'User block' },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function actionColor(action: string) {
  if (action.startsWith('order')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (action.startsWith('review')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (action.startsWith('user_verify')) return 'bg-cup-teal-50 text-cup-teal-700 border-cup-teal-200';
  if (action.startsWith('user_block')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-cup-brown-100 text-cup-brown-700 border-cup-stroke';
}

export default function AuditPage() {
  const toast = useToast();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.role !== 'owner') router.replace('/');
  }, [session, router]);

  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (currentOffset: number, action: string) => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      setLoading(true);
      try {
        const res = await adminApi.getAuditLog(
          { ...(action ? { action } : {}), limit: PAGE_SIZE, offset: currentOffset },
          ctl.signal,
        );
        if (ctl.signal.aborted) return;
        setEntries(res.entries);
        setTotal(res.total);
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
        toast('error', (err as Error).message);
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    setOffset(0);
    load(0, actionFilter);
  }, [actionFilter, load]);

  function handlePage(dir: 1 | -1) {
    const next = offset + dir * PAGE_SIZE;
    setOffset(next);
    load(next, actionFilter);
  }

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.target.toLowerCase().includes(search.toLowerCase()) ||
        e.detail.toLowerCase().includes(search.toLowerCase()) ||
        e.adminId.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Admin</p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900 flex items-center gap-2">
            <ScrollText className="h-7 w-7 text-cup-orange-600" />
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-cup-muted">Track all admin actions across the system.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-cup-muted">
          <span className="font-semibold text-cup-brown-900">{total}</span> total entries
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cup-muted" />
          <input
            type="search"
            placeholder="Search by target, detail, or admin ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-cup-stroke bg-white pl-9 pr-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-cup-stroke bg-white px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-card border border-cup-stroke bg-white shadow-card">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-5 w-24 rounded bg-cup-stroke" />
                <div className="h-5 flex-1 rounded bg-cup-stroke" />
                <div className="h-5 w-32 rounded bg-cup-stroke" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-cup-muted">
            <ScrollText className="mx-auto h-10 w-10 text-cup-stroke mb-3" />
            <p className="font-semibold text-cup-brown-900">No entries found</p>
            <p className="mt-1 text-sm">Try adjusting your filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cup-stroke bg-cup-cream-100 text-left">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-cup-muted">Time</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-cup-muted">Action</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-cup-muted">Target</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-cup-muted">Admin</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-cup-muted sr-only">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cup-stroke">
              {filtered.map((entry) => (
                <Fragment key={entry.id}>
                  <tr
                    tabIndex={0}
                    role="button"
                    aria-expanded={expanded === entry.id}
                    onClick={() => setExpanded((prev) => (prev === entry.id ? null : entry.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpanded((prev) => (prev === entry.id ? null : entry.id));
                      }
                    }}
                    className="cursor-pointer transition hover:bg-cup-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cup-orange-600"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-cup-muted">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionColor(entry.action)}`}>
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-cup-brown-900 max-w-[180px] truncate">
                      {entry.target}
                    </td>
                    <td className="px-4 py-3 text-xs text-cup-muted font-mono">
                      <span className="truncate">{entry.adminId.slice(-8)}</span>
                      <span className="ml-1 capitalize text-cup-brown-500">({entry.adminRole})</span>
                    </td>
                    <td className="px-4 py-3 text-cup-muted">
                      {expanded === entry.id
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr className="bg-cup-cream-100">
                      <td colSpan={5} className="px-6 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-cup-muted mb-1">Detail</p>
                        <p className="text-sm text-cup-brown-900 whitespace-pre-wrap">{entry.detail}</p>
                        <p className="mt-1 font-mono text-[10px] text-cup-muted">ID: {entry.id}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={offset === 0 || loading}
            onClick={() => handlePage(-1)}
            className="rounded-pill border border-cup-stroke bg-white px-4 py-2 font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-cup-muted">
            Page <span className="font-semibold text-cup-brown-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-cup-brown-900">{totalPages}</span>
          </span>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => handlePage(1)}
            className="rounded-pill border border-cup-stroke bg-white px-4 py-2 font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
