'use client';

import { useEffect, useState } from 'react';
import { getSession, type AdminSession } from './session';

/**
 * Tiny client hook so individual pages can react to the active session
 * without prop-drilling through the layout. Returns `null` on first render
 * (SSR/initial paint), then the real session after hydration.
 *
 * The `(authed)` layout already gates rendering on session presence, so any
 * page using this hook is guaranteed to receive a non-null session by the
 * time its UI is interactable — but consumers should still narrow the type.
 */
export function useSession(): AdminSession | null {
  const [session, setSession] = useState<AdminSession | null>(null);
  useEffect(() => {
    setSession(getSession());
  }, []);
  return session;
}
