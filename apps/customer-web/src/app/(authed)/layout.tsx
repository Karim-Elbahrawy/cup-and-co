'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { PhoneFrame } from '@/components/PhoneFrame';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { FeatureFlagProvider } from '@/lib/featureFlags';
import { useSession } from '@/lib/session';

/**
 * Auth-guarded shell. Redirects to `/login` if there's no session token —
 * but only after Zustand has hydrated, so the SSR pass and the first client
 * render don't disagree about whether the user is signed in.
 */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useSession((s) => s.hydrated);
  const token = useSession((s) => s.token);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  // While hydrating (server render + first client tick) we show a soft
  // shell so the layout doesn't shift when the auth state lands.
  if (!hydrated) {
    return (
      <PhoneFrame>
        <div className="flex min-h-screen items-center justify-center" aria-hidden="true">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--cup-stroke)]" />
        </div>
      </PhoneFrame>
    );
  }

  if (!token) {
    // Render nothing while the redirect to /login is in flight.
    return null;
  }

  return (
    <FeatureFlagProvider>
      <PhoneFrame>
        <OfflineIndicator />
        <div className="flex min-h-screen flex-col pb-[88px]">{children}</div>
        <BottomNav />
      </PhoneFrame>
    </FeatureFlagProvider>
  );
}
