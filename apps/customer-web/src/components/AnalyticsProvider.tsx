/**
 * Client-side bootstrap for PostHog. Mounted in app/layout.tsx so the SDK
 * initializes once per session.
 *
 * Phase 1.2 of docs/UPGRADE-PLAN.md.
 */
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, track } from '@/lib/analytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Init once per session. Subsequent renders re-call but `initAnalytics`
  // is idempotent.
  useEffect(() => {
    initAnalytics();
    // app_opened: fired on first mount only. We use a sessionStorage flag
    // to detect "first open of this browser session."
    const isFirstOpen = !sessionStorage.getItem('cup-co-session-started');
    if (isFirstOpen) {
      sessionStorage.setItem('cup-co-session-started', '1');
      track({
        name: 'app_opened',
        props: {
          platform: 'web',
          app_version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev',
          is_first_open: !localStorage.getItem('cup-co-has-opened'),
        },
      });
      localStorage.setItem('cup-co-has-opened', '1');
    }
  }, []);

  // Page-view tracking on every route change. We handle this manually
  // (instead of PostHog autocapture) so we can include locale and clean
  // path parameters out of the URL if needed.
  useEffect(() => {
    if (!pathname) return;
    track({
      name: 'page_viewed',
      props: {
        path: pathname,
        locale: typeof document !== 'undefined' ? (document.documentElement.lang ?? 'en') : 'en',
      },
    });
  }, [pathname]);

  return <>{children}</>;
}
