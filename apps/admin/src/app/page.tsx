import Image from 'next/image';

/**
 * Phase 0 admin shell with new palette. Phase 1 brings real login + today overview.
 * Phase 2 brings the live orders kanban.
 */
export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-[var(--cup-paper)] px-8 py-10 font-body text-[var(--cup-espresso)]">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center gap-4">
          <Image src="/brand/monogram.svg" alt="Cup & Co" width={56} height={56} priority />
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Cup &amp; Co</h1>
            <p className="mt-0.5 text-sm text-[var(--cup-muted)]">Owner &middot; Barista console</p>
          </div>
        </header>

        <section className="rounded-[20px] border border-[var(--cup-stroke)] bg-white p-6 shadow-[0_4px_16px_rgba(28,25,23,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-semibold">Phase 1 — coming next</h2>
              <p className="mt-2 text-sm text-[var(--cup-cocoa)]">
                Email login, today overview (revenue, active orders, kiosk status), live orders skeleton,
                role-gated menu and settings tabs.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--cup-accent-tint)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--cup-accent)]">
              In progress
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Today revenue', value: 'EGP —', hint: 'Phase 1' },
              { label: 'Active orders', value: '—', hint: 'Phase 2' },
              { label: 'Kiosk', value: 'Open', hint: 'Phase 1' },
            ].map((m) => (
              <div key={m.label} className="rounded-[16px] border border-[var(--cup-stroke)] bg-[var(--cup-paper)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--cup-muted)]">{m.label}</p>
                <p className="mt-2 font-heading text-2xl font-bold">{m.value}</p>
                <p className="mt-1 text-xs text-[var(--cup-accent)]">{m.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--cup-stroke)] bg-white p-6 shadow-[0_4px_16px_rgba(28,25,23,0.06)]">
          <h3 className="font-heading text-base font-semibold">Foundation</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--cup-cocoa)]">
            <li>• 16 admin permissions wired in API (Owner / Barista RBAC)</li>
            <li>• Espresso Sunrise palette synced with customer app + iOS</li>
            <li>• Connected to API at <code>http://localhost:4000</code></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
