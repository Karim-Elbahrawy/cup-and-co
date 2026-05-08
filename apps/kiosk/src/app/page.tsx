'use client';

import { useRouter } from 'next/navigation';
import { AttractScreen } from '@/components/AttractScreen';

/**
 * Home route — the attract loop. Tap anywhere advances to /catalog.
 *
 * The actual catalog grid lands in K1.2; for now /catalog renders a
 * "Browsing soon" placeholder so the navigation flow is real and the
 * idle-reset round trip can be exercised end-to-end.
 */
export default function KioskHome() {
  const router = useRouter();

  return (
    <AttractScreen
      onActivate={() => {
        // Prefetch was already triggered on first paint by Next's RSC layer.
        router.push('/catalog');
      }}
    />
  );
}
