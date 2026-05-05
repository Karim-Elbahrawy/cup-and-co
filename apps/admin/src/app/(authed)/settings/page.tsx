'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { KioskToggle } from '@/components/KioskToggle';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useSession } from '@/lib/useSession';
import { can } from '@/lib/permissions';
import { adminApi, ApiError, type AdminKioskStatus } from '@/lib/api';

/**
 * Kiosk settings — wired to /admin/kiosk/status (GET + PATCH).
 *
 * Owners see and can edit capacity-per-slot, opening hours, and the
 * customer-facing status messages. Baristas can only flip the open/close
 * toggle (they bypass the form via the same KioskToggle on the dashboard).
 */
export default function SettingsPage() {
  const session = useSession();
  const toast = useToast();
  const canManageSettings = can(session?.role, 'kiosk:settings');
  const canToggleOpen = can(session?.role, 'kiosk:update_open_status');

  const [kiosk, setKiosk] = useState<AdminKioskStatus | null>(null);
  const [draft, setDraft] = useState<AdminKioskStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getKioskStatus()
      .then((res) => {
        if (cancelled) return;
        setKiosk(res);
        setDraft(res);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : 'Could not load settings.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle(open: boolean) {
    if (!kiosk) return;
    const previous = kiosk;
    setKiosk({ ...kiosk, is_open: open });
    setDraft((d) => (d ? { ...d, is_open: open } : d));
    try {
      const next = await adminApi.updateKioskStatus({ is_open: open });
      setKiosk(next);
      setDraft(next);
      toast('success', open ? 'Kiosk open.' : 'Kiosk closed.');
    } catch (err) {
      setKiosk(previous);
      setDraft(previous);
      toast('error', err instanceof ApiError ? err.message : 'Could not update.');
      throw err;
    }
  }

  async function handleSave() {
    if (!draft || !canManageSettings) return;
    setSaving(true);
    try {
      const next = await adminApi.updateKioskStatus({
        capacity_per_slot: draft.capacity_per_slot,
        slot_minutes: draft.slot_minutes,
        opens_at: draft.opens_at,
        closes_at: draft.closes_at,
        message_en: draft.message_en,
        message_ar: draft.message_ar,
      });
      setKiosk(next);
      setDraft(next);
      toast('success', 'Settings saved.');
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    !!kiosk &&
    !!draft &&
    (draft.capacity_per_slot !== kiosk.capacity_per_slot ||
      draft.slot_minutes !== kiosk.slot_minutes ||
      draft.opens_at !== kiosk.opens_at ||
      draft.closes_at !== kiosk.closes_at ||
      draft.message_en !== kiosk.message_en ||
      draft.message_ar !== kiosk.message_ar);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Configuration</p>
        <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Settings</h1>
        <p className="mt-1 text-sm text-cup-muted">
          Open the kiosk, close it, set capacity, set hours, customize messages.
        </p>
      </header>

      {loadError && (
        <p
          role="alert"
          className="rounded-chip border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error"
        >
          {loadError}
        </p>
      )}

      {/* Kiosk status card */}
      <section className="rounded-card border border-cup-stroke bg-cup-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-cup-brown-900">Kiosk status</h2>
            <p className="mt-1 text-sm text-cup-muted">
              When closed, customers can browse but not place orders.
            </p>
          </div>
          {kiosk ? (
            <KioskToggle
              key={String(kiosk.is_open)}
              initialOpen={kiosk.is_open}
              disabled={!canToggleOpen}
              onChange={handleToggle}
            />
          ) : (
            <Skeleton className="h-9 w-28" />
          )}
        </div>
      </section>

      {/* Capacity + hours */}
      <section
        className={`rounded-card border border-cup-stroke bg-cup-surface p-6 shadow-card ${
          canManageSettings ? '' : 'opacity-60'
        }`}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-cup-brown-900">Capacity & hours</h2>
            <p className="mt-1 text-sm text-cup-muted">
              Owner-only. Caps how many orders we accept per slot, and when the kiosk is open.
            </p>
          </div>
          {!canManageSettings && (
            <span className="rounded-pill bg-cup-brown-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-cup-muted">
              Owner only
            </span>
          )}
        </header>

        {!draft ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              <NumberField
                label="Capacity / slot"
                min={1}
                max={50}
                value={draft.capacity_per_slot}
                disabled={!canManageSettings}
                onChange={(v) => setDraft({ ...draft, capacity_per_slot: v })}
              />
              <NumberField
                label="Slot minutes"
                min={5}
                max={60}
                step={5}
                value={draft.slot_minutes}
                disabled={!canManageSettings}
                onChange={(v) => setDraft({ ...draft, slot_minutes: v })}
              />
              <TimeField
                label="Opens at"
                value={draft.opens_at}
                disabled={!canManageSettings}
                onChange={(v) => setDraft({ ...draft, opens_at: v })}
              />
              <TimeField
                label="Closes at"
                value={draft.closes_at}
                disabled={!canManageSettings}
                onChange={(v) => setDraft({ ...draft, closes_at: v })}
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TextField
                label="Message (English)"
                value={draft.message_en ?? ''}
                disabled={!canManageSettings}
                placeholder="We are open — your morning is handled"
                onChange={(v) => setDraft({ ...draft, message_en: v || null })}
              />
              <TextField
                label="Message (Arabic)"
                value={draft.message_ar ?? ''}
                disabled={!canManageSettings}
                placeholder="مفتوحون — صباحك معانا"
                rtl
                onChange={(v) => setDraft({ ...draft, message_ar: v || null })}
              />
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          {dirty && !saving && (
            <span className="text-xs text-cup-muted">Unsaved changes</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canManageSettings || !dirty || saving}
            className="inline-flex items-center gap-2 rounded-pill bg-cup-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Field primitives ──────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 disabled:bg-cup-cream-100"
      />
    </label>
  );
}

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">{label}</span>
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 disabled:bg-cup-cream-100"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  disabled,
  placeholder,
  rtl,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  rtl?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        dir={rtl ? 'rtl' : undefined}
        maxLength={140}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 disabled:bg-cup-cream-100"
      />
    </label>
  );
}
