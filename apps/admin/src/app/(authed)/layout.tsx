'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ToastHost } from '@/components/Toast';
import { getSession, type AdminSession } from '@/lib/session';

/**
 * Auth guard for every authed admin route. Reads `admin_session` from
 * localStorage on mount; if it's missing we replace the URL with `/login`.
 *
 * Done client-side because Phase 1 has no server session — when Phase 2 wires
 * Supabase Auth we'll move this into a Next middleware / RSC check.
 */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const found = getSession();
    if (!found) {
      router.replace('/login');
      return;
    }
    setSession(found);
    setChecked(true);
  }, [router]);

  if (!checked || !session) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-cup-paper text-sm text-cup-muted"
        role="status"
        aria-live="polite"
      >
        Loading…
      </div>
    );
  }

  return (
    <ToastHost>
      <div className="flex min-h-screen bg-cup-paper">
        <Sidebar session={session} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </ToastHost>
  );
}
