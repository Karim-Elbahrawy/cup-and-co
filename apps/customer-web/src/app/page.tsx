import Image from 'next/image';
import Link from 'next/link';

/**
 * Phase 0 + design upgrade. Phase 1 replaces this with the real Home page —
 * greeting, search bar, role tabs, product grid — pixel-faithful to the
 * upgraded design.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--cup-paper)] px-6 py-10 font-body text-[var(--cup-espresso)]">
      <div className="mx-auto max-w-md space-y-8">
        <header className="flex items-center gap-3">
          <Image src="/brand/monogram.svg" alt="Cup & Co" width={48} height={48} priority />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--cup-muted)]">Good Morning</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Cup &amp; Co</h1>
          </div>
        </header>

        <section
          className="cup-sunrise relative overflow-hidden rounded-[20px] p-6 text-white shadow-[0_8px_24px_rgba(194,65,12,0.18)]"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-90">Today Only</p>
          <p className="mt-1 font-heading text-4xl font-bold leading-tight">70% OFF</p>
          <p className="mt-1 text-sm opacity-90">Super Discount</p>
          <button
            className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--cup-primary)] shadow-[0_2px_8px_rgba(28,25,23,0.08)] transition active:scale-[0.98]"
          >
            Order Now
          </button>
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </section>

        <section>
          <p className="font-heading text-lg font-semibold">Foundation ready</p>
          <p className="mt-2 text-sm text-[var(--cup-muted)]">
            Espresso Sunrise palette in place across web, admin, and iOS. Phase 1 brings real auth,
            role selection, and the Home page in full.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--cup-cocoa)]">
            <li>
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--cup-primary)] align-middle mr-2" />
              Terracotta primary <code className="text-xs">#C2410C</code>
            </li>
            <li>
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--cup-accent)] align-middle mr-2" />
              Deep teal accent <code className="text-xs">#0F766E</code>
            </li>
            <li>
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--cup-paper)] border border-[var(--cup-stroke)] align-middle mr-2" />
              Warm paper background <code className="text-xs">#FAF6F0</code>
            </li>
          </ul>
          <Link
            href="/health"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--cup-stroke)] bg-white px-4 py-2 text-sm font-medium text-[var(--cup-cocoa)] hover:border-[var(--cup-primary)] transition"
          >
            Check API health →
          </Link>
        </section>

        <section className="rounded-[20px] border border-[var(--cup-stroke)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--cup-muted)]">Sample Item</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[var(--cup-cream)]">
              {/* Generated SVG placeholder */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/products/velvet-cappuccino.svg" alt="Velvet Cappuccino" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-heading text-base font-semibold">Velvet Cappuccino</p>
              <p className="text-xs text-[var(--cup-muted)]">Silky steamed milk · cocoa dust</p>
              <p className="mt-1 text-sm font-semibold text-[var(--cup-primary)]">EGP 65</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
