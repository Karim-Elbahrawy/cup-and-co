'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tablet, Wifi, WifiOff, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { adminApi, ApiError, type AdminKiosk } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

/**
 * Phase K6.3 — Kiosks dashboard.
 *
 * Lists every iPad that has heartbeat'd within memory (auto-created on
 * first contact, see API kiosksStore.recordHeartbeat). Each row shows:
 *
 *   - Traffic-light dot:
 *       green  = heartbeat in the last 90s (kiosk healthy)
 *       amber  = 90s–5min (probably reconnecting / sleeping)
 *       red    = >5min (probably offline / unplugged)
 *   - Name (admin-renameable inline)
 *   - Last screen state (attract / browsing / customizing / etc.)
 *   - Last seen (relative time)
 *   - Build version
 *   - Active toggle
 *
 * Auto-polls every 15s while open so the page reflects real-time
 * health without manual refresh. Cheap because the response is tiny.
 */

const POLL_MS = 15_000;

export default function KiosksPage() {
  const toast = useToast();
  const [kiosks, setKiosks] = useState<AdminKiosk[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  // Initial fetch + 15s poll. Cancel-aware so we don't leak fetches
  // when the page unmounts.
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    const load = async () => {
      try {
        const res = await adminApi.listKiosks(ctrl.signal);
        if (!cancelled) {
          setKiosks(res.kiosks);
          setError(null);
        }
      } catch (e) {
        if (cancelled || ctrl.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : 'Could not load kiosks.');
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearInterval(interval);
    };
  }, []);

  async function saveName(id: string) {
    const name = draftName.trim();
    if (!name) {
      setEditing(null);
      return;
    }
    // Optimistic.
    setKiosks((prev) =>
      prev ? prev.map((k) => (k.id === id ? { ...k, name } : k)) : prev,
    );
    setEditing(null);
    try {
      await adminApi.updateKiosk(id, { name });
      toast('success', `Kiosk renamed to "${name}".`);
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Rename failed.');
    }
  }

  async function toggleActive(kiosk: AdminKiosk) {
    const next = !kiosk.active;
    setKiosks((prev) =>
      prev ? prev.map((k) => (k.id === kiosk.id ? { ...k, active: next } : k)) : prev,
    );
    try {
      await adminApi.updateKiosk(kiosk.id, { active: next });
    } catch (e) {
      // Revert on failure.
      setKiosks((prev) =>
        prev ? prev.map((k) => (k.id === kiosk.id ? { ...k, active: !next } : k)) : prev,
      );
      toast('error', e instanceof ApiError ? e.message : 'Update failed.');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
          Operations
        </p>
        <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Kiosks</h1>
        <p className="mt-1 text-sm text-cup-muted">
          Every iPad that&apos;s checked in. Heartbeats refresh every minute.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-card bg-cup-error/10 px-4 py-3 text-sm font-semibold text-cup-error"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {kiosks === null ? (
        <LoadingTable />
      ) : kiosks.length === 0 ? (
        <EmptyState
          icon={Tablet}
          title="No kiosks yet."
          description="As soon as an iPad on the floor sends its first heartbeat, it will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {kiosks.map((k) => (
            <KioskRow
              key={k.id}
              kiosk={k}
              isEditing={editing === k.id}
              draftName={draftName}
              onStartEdit={() => {
                setEditing(k.id);
                setDraftName(k.name);
              }}
              onCancelEdit={() => setEditing(null)}
              onChangeDraft={setDraftName}
              onSaveName={() => saveName(k.id)}
              onToggleActive={() => toggleActive(k)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

type Health = 'green' | 'amber' | 'red' | 'never';

function healthFor(lastSeenAt: number): Health {
  if (!lastSeenAt) return 'never';
  const sinceMs = Date.now() - lastSeenAt;
  if (sinceMs < 90_000) return 'green';
  if (sinceMs < 5 * 60_000) return 'amber';
  return 'red';
}

function relativeTime(ms: number): string {
  if (!ms) return 'never';
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

const STATE_LABEL: Record<AdminKiosk['lastState'], string> = {
  attract: 'Idle (attract)',
  browsing: 'Browsing menu',
  customizing: 'Customizing',
  checkout: 'Checking out',
  confirmation: 'Order placed',
  cleaning: 'Locked for cleaning',
  unknown: 'Unknown',
};

function KioskRow({
  kiosk,
  isEditing,
  draftName,
  onStartEdit,
  onCancelEdit,
  onChangeDraft,
  onSaveName,
  onToggleActive,
}: {
  kiosk: AdminKiosk;
  isEditing: boolean;
  draftName: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChangeDraft: (next: string) => void;
  onSaveName: () => void;
  onToggleActive: () => void;
}) {
  const health = healthFor(kiosk.lastSeenAt);

  return (
    <li
      className={`flex items-center gap-4 rounded-card border bg-cup-surface p-4 shadow-subtle transition ${
        kiosk.active ? 'border-cup-stroke' : 'border-dashed border-cup-stroke opacity-60'
      }`}
    >
      <HealthDot health={health} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveName();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={draftName}
                onChange={(e) => onChangeDraft(e.target.value)}
                autoFocus
                maxLength={80}
                className="rounded-pill border border-cup-stroke bg-white px-3 py-1 text-sm font-semibold text-cup-brown-900 focus:border-cup-orange-500 focus:outline-none focus:ring-2 focus:ring-cup-orange-200"
              />
              <button
                type="submit"
                aria-label="Save name"
                className="grid h-7 w-7 place-items-center rounded-full bg-cup-teal-100 text-cup-teal-700 transition hover:bg-cup-teal-200"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                aria-label="Cancel rename"
                className="grid h-7 w-7 place-items-center rounded-full bg-cup-paper text-cup-muted transition hover:bg-cup-stroke"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <>
              <p className="truncate font-heading text-base font-bold text-cup-brown-900">
                {kiosk.name}
              </p>
              <button
                type="button"
                onClick={onStartEdit}
                aria-label={`Rename ${kiosk.name}`}
                className="grid h-6 w-6 place-items-center rounded-full text-cup-muted transition hover:bg-cup-paper hover:text-cup-brown-700"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-cup-muted">
          {STATE_LABEL[kiosk.lastState]} · {relativeTime(kiosk.lastSeenAt)}
          {kiosk.version ? ` · ${kiosk.version}` : ''}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-cup-muted">
          {kiosk.id}
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleActive}
        className={`rounded-pill px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
          kiosk.active
            ? 'bg-cup-teal-100 text-cup-teal-700 hover:bg-cup-teal-200'
            : 'bg-cup-stroke text-cup-muted hover:bg-cup-paper'
        }`}
      >
        {kiosk.active ? 'Active' : 'Disabled'}
      </button>
    </li>
  );
}

function HealthDot({ health }: { health: Health }) {
  const ariaLabel =
    health === 'green'
      ? 'Healthy'
      : health === 'amber'
        ? 'Reconnecting'
        : health === 'red'
          ? 'Offline'
          : 'Never seen';

  // Icon switches with health: a Wifi for healthy, WifiOff for offline.
  // The dot itself sits behind the icon as a coloured halo.
  const Icon = health === 'green' ? Wifi : WifiOff;
  const cls =
    health === 'green'
      ? 'bg-cup-teal-100 text-cup-teal-700'
      : health === 'amber'
        ? 'bg-cup-orange-100 text-cup-orange-700'
        : health === 'red'
          ? 'bg-cup-error/15 text-cup-error'
          : 'bg-cup-stroke text-cup-muted';

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={`grid h-10 w-10 place-items-center rounded-full ${cls}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function LoadingTable() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 rounded-card border border-cup-stroke bg-cup-surface p-4"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-16 rounded-pill" />
        </li>
      ))}
    </ul>
  );
}
