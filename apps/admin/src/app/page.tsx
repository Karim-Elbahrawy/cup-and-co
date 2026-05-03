/**
 * Phase 0 admin shell. Phase 1 wires the real login + today overview.
 * Phase 2 brings the live orders kanban.
 */
export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-cup-surface px-8 py-12 font-body text-cup-brown">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="font-heading text-3xl font-bold">Cup &amp; Co — Admin</h1>
          <p className="mt-1 text-cup-muted">Owner / Barista console</p>
        </header>

        <section className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
          <h2 className="font-heading text-xl font-semibold">Phase 0 scaffold</h2>
          <p className="mt-2 text-sm text-cup-muted">
            Foundation in place. Phase 1 brings login + today overview. Phase 2 brings the live kanban
            board with status transitions and push notifications to the customer app.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>• Role-based permissions (Owner / Barista) wired in API</li>
            <li>• Tailwind theme matches customer app</li>
            <li>• Connected to API at <code>http://localhost:4000</code></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
