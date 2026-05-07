/**
 * useOnlineStatus — Phase 8.1 of UPGRADE-PLAN.md.
 *
 * SSR-safe wrapper around navigator.onLine + the online/offline
 * window events. Returns `true` until the browser has actually told
 * us otherwise so the initial paint doesn't flash a fake "offline"
 * state for a microsecond.
 */
'use client';

import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
