'use client';

import { useState } from 'react';
import { KioskToggle } from '@/components/KioskToggle';
import { useSession } from '@/lib/useSession';
import { can } from '@/lib/permissions';

/**
 * Kiosk settings. Both roles see the open/close toggle. Only owners see
 * capacity-per-slot, opening hours, and other operational tunables.
 *
 * The PATCH endpoints for `/admin/kiosk/status` and `/admin/kiosk/settings`
 * don't exist yet — Phase 2 wires them up. Until then, controls degrade
 * gracefully with optimistic local state.
 */
export default function SettingsPage() {
  const session = useSession();
  const canManageSettings = can(session?.role, 'kiosk:settings');
  const canToggleOpen = can(session?.role, 'kiosk:update_open_status');

  const [capacity, setCapacity] = useState(8);
  const [opensAt, setOpensAt] = useState('07:30');
  const [closesAt, setClosesAt] = useState('18:00');

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
          Configuration
        </p>
        <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Settings</h1>
        <p className="mt-1 text-sm text-cup-muted">
          Open the kiosk, close it, set capacity, set hours.
        </p>
      </header>

      <section className="rounded-card border border-cup-stroke bg-cup-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-cup-brown-900">
              Kiosk status
            </h2>
            <p className="mt-1 text-sm text-cup-muted">
              When closed, customers can browse but not place orders.
            </p>
          </div>
          <KioskToggle
            initialOpen
            disabled={!canToggleOpen}
            onChange={async () => {
              // TODO Phase 2: PATCH /admin/kiosk/status — endpoint pending.
            }}
          />
        </div>
        <p className="mt-3 text-xs text-cup-muted">
          UI-only until Phase 2 ships <code className="font-mono">/admin/kiosk/status</code>.
        </p>
      </section>

      <section
        className={`rounded-card border border-cup-stroke bg-cup-surface p-6 shadow-card ${
          canManageSettings ? '' : 'opacity-60'
        }`}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-cup-brown-900">
              Capacity & hours
            </h2>
            <p className="mt-1 text-sm text-cup-muted">
              Owner-only. Limits how many orders we accept per slot.
            </p>
          </div>
          {!canManageSettings && (
            <span className="rounded-pill bg-cup-brown-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-cup-muted">
              Owner only
            </span>
          )}
        </header>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">
              Capacity / slot
            </span>
            <input
              type="number"
              min={1}
              max={50}
              value={capacity}
              disabled={!canManageSettings}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 disabled:bg-cup-cream-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">
              Opens at
            </span>
            <input
              type="time"
              value={opensAt}
              disabled={!canManageSettings}
              onChange={(e) => setOpensAt(e.target.value)}
              className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 disabled:bg-cup-cream-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">
              Closes at
            </span>
            <input
              type="time"
              value={closesAt}
              disabled={!canManageSettings}
              onChange={(e) => setClosesAt(e.target.value)}
              className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 disabled:bg-cup-cream-100"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled
            className="rounded-pill bg-cup-orange-600/40 px-4 py-2 text-sm font-semibold text-white shadow-subtle disabled:cursor-not-allowed"
            title="Phase 2"
          >
            Save · Phase 2
          </button>
        </div>
      </section>
    </div>
  );
}
