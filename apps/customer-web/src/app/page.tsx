import Link from 'next/link';

/**
 * Phase 0 placeholder. Phase 1 replaces this with the real Home page that
 * pixel-matches the Figma reference (greeting, search, promo banner,
 * Student/Faculty/Office tabs, product grid).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-cup-cream-100 px-6 py-12 font-body text-cup-brown">
      <div className="mx-auto max-w-md space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-cup-muted">Good Morning</p>
          <h1 className="font-heading text-4xl font-bold tracking-tight">Cup &amp; Co</h1>
          <p className="text-base text-cup-muted">Your morning, handled.</p>
        </header>

        <section className="rounded-card bg-cup-orange-500 p-6 text-white shadow-card">
          <p className="text-sm uppercase tracking-wider opacity-90">Today Only</p>
          <p className="mt-1 font-heading text-3xl font-bold">70% OFF</p>
          <p className="mt-1 text-sm opacity-90">Super Discount</p>
          <button className="mt-4 rounded-pill bg-white px-5 py-2 text-sm font-semibold text-cup-orange-600 shadow-subtle">
            Order Now
          </button>
        </section>

        <section>
          <p className="font-heading text-lg font-semibold">Phase 0 scaffold</p>
          <p className="mt-2 text-sm text-cup-muted">
            Foundation in place. Phase 1 replaces this page with the real Home matching your Figma reference
            (greeting, search bar, promo banner, role tabs, product grid).
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>• Design tokens loaded from <code>@cup-and-co/design-tokens</code></li>
            <li>• Bilingual EN/AR via <code>next-intl</code></li>
            <li>• Tailwind theme wired to brand palette</li>
            <li>• Express API at <code>http://localhost:4000</code></li>
          </ul>
          <Link
            href="/health"
            className="mt-6 inline-block rounded-pill border border-cup-stroke bg-white px-4 py-2 text-sm"
          >
            Check API health →
          </Link>
        </section>
      </div>
    </main>
  );
}
