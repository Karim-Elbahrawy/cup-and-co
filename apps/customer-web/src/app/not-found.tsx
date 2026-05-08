import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--cup-paper)] px-6 text-center">
      <p className="font-heading text-[64px] font-bold leading-none text-[var(--cup-primary)]">
        404
      </p>
      <h1 className="mt-4 font-heading text-xl font-bold text-[var(--cup-espresso)]">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--cup-muted)]">
        Looks like that link is bitter. Let&apos;s get you back to the menu.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-pill bg-[var(--cup-primary)] px-8 py-3 text-sm font-bold text-white shadow-subtle transition-transform active:scale-[0.97]"
      >
        Back to home
      </Link>
    </main>
  );
}
