'use client';

/**
 * Registers the service worker on first mount.
 * Phase 8.1 of UPGRADE-PLAN.md.
 *
 * Skipped in dev (Next.js dev server doesn't serve a usable
 * production-style sw, and HMR + service workers don't mix). Only
 * registers when the host isn't localhost AND the browser supports
 * Service Workers (every modern browser does).
 */

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Skip in dev so HMR keeps working.
    if (process.env.NODE_ENV === 'development') return;

    const url = '/sw.js';
    navigator.serviceWorker
      .register(url, { scope: '/' })
      .catch((err) => {
        // Don't surface — failures here are noisy and non-fatal.
        // eslint-disable-next-line no-console
        console.warn('[cup-co] service worker registration failed:', err);
      });
  }, []);

  return null;
}
