'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { BigButton } from '@/components/BigButton';
import { useIdleReset } from '@/lib/useIdleReset';

/**
 * /catalog — placeholder destination for K1.1's tap-anywhere transition.
 *
 * The real category-tabbed grid lands in K1.2. We ship a real route now (not
 * a /preview hash) so:
 *   - The browser back-button + idle-reset both round-trip cleanly
 *   - Next.js prefetches it on hover/visibility from the AttractScreen
 *   - The transition feels like the real thing on iPad day-one
 *
 * Idle-reset wired here too so a customer who taps in then walks away gets
 * pushed back to the attract loop after 90s without input. K1.9 adds the
 * "still there?" confirmation overlay on top of this same hook.
 */
export default function CatalogPlaceholder() {
  const router = useRouter();

  useIdleReset({
    onIdle: () => router.replace('/'),
    timeoutMs: 90_000,
  });

  return (
    <main className="grid h-dvh w-dvw place-items-center bg-[var(--cup-paper)] px-12">
      <div className="max-w-3xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.4em] text-[var(--cup-muted)]">
          Coming next
        </p>
        <h1 className="font-heading text-k-hero text-[var(--cup-espresso)]">
          The menu opens here.
        </h1>
        <p className="mt-6 font-body text-k-card text-[var(--cup-cocoa)]">
          K1.2 ships the category-tabbed grid. For now, head back to the
          attract loop — or hang here for 90 seconds and we&apos;ll do it for
          you.
        </p>

        <div className="mt-12 flex justify-center gap-4">
          <BigButton
            variant="secondary"
            leadingIcon={<ChevronLeft className="h-7 w-7" />}
            onClick={() => router.replace('/')}
          >
            Back to attract loop
          </BigButton>
        </div>
      </div>
    </main>
  );
}
