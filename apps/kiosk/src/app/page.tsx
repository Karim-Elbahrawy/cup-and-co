import { Coffee } from 'lucide-react';

/**
 * K0 placeholder. Replaced in K1.1 by the real attract-loop ("TAP TO ORDER")
 * splash. This screen exists only so the first deploy lands a recognisable
 * Cup & Co page on the iPad before any real flow is wired up.
 */
export default function KioskHome() {
  return (
    <main className="relative grid h-dvh w-dvw place-items-center overflow-hidden cup-sunrise">
      {/* Soft cream halo behind the mark — bumps perceived depth without
          adding a real image dependency at this stage. */}
      <div
        aria-hidden="true"
        className="absolute h-[120vmin] w-[120vmin] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, #FEF3C7 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center text-white">
        <div className="mb-10 grid h-32 w-32 place-items-center rounded-full bg-white/15 backdrop-blur-sm">
          <Coffee className="h-16 w-16" aria-hidden="true" strokeWidth={1.75} />
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.4em] text-white/80">
          Cup &amp; Co Kiosk
        </p>
        <h1 className="font-heading text-k-display">Coming soon.</h1>
        <p className="mt-6 max-w-xl font-body text-k-body text-white/85">
          Tap-to-order is on its way. Order at the counter for now.
        </p>
      </div>
    </main>
  );
}
