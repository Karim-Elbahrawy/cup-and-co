'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[customer-web]', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--cup-paper)] px-6 text-center">
      <h1 className="font-heading text-2xl font-bold text-[var(--cup-espresso)]">
        Something brewed wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--cup-muted)]">
        We hit an unexpected snag. Try again — and if it keeps happening, refresh the page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-pill bg-[var(--cup-primary)] px-8 py-3 text-sm font-bold text-white shadow-subtle transition-transform active:scale-[0.97]"
      >
        Try again
      </button>
    </main>
  );
}
