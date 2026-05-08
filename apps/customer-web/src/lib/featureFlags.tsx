'use client';

/**
 * Client-side feature-flag context.
 *
 * Lifecycle:
 *   1. <FeatureFlagProvider> mounts inside the authed shell, fetches
 *      `GET /me/feature-flags` once, and stores the assignment map.
 *   2. Components call `useFeatureFlag('welcome_banner')` and get back the
 *      variant string (e.g. `'control'` or `'variant_a'`). Before the fetch
 *      resolves the hook returns the supplied fallback (default `'control'`).
 *   3. Bucketing is deterministic on the server, so a refresh always yields
 *      the same variant — no need to persist the response in localStorage.
 *
 * Failure mode:
 *   If the fetch throws (network down, server 500), the provider keeps the
 *   empty assignment map. Every `useFeatureFlag` call falls through to its
 *   fallback, so the UI degrades to whatever the "off" branch renders. This
 *   is intentional: a flag system that crashes the page is worse than no
 *   flags at all.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { FeatureFlagAssignments, FeatureFlagName } from './types';

interface FeatureFlagContextValue {
  flags: FeatureFlagAssignments;
  loaded: boolean;
  /** Refresh from the server. Useful after the user changes role or campus. */
  refresh: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: {},
  loaded: false,
  refresh: async () => {},
});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlagAssignments>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.myFeatureFlags();
      setFlags(res.flags ?? {});
    } catch {
      // Swallow — fallback variants kick in via useFeatureFlag.
      setFlags({});
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .myFeatureFlags()
      .then((res) => {
        if (!cancelled) setFlags(res.flags ?? {});
      })
      .catch(() => {
        if (!cancelled) setFlags({});
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<FeatureFlagContextValue>(
    () => ({ flags, loaded, refresh }),
    [flags, loaded, refresh],
  );

  return (
    <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
  );
}

/**
 * Read the current user's variant for a flag.
 *
 * @param name      Flag name (must match the API's FlagName union).
 * @param fallback  Variant returned before the fetch resolves OR if the
 *                  flag isn't in the server response. Defaults to
 *                  `'control'` because that's the safe "no-op" branch
 *                  in every flag we ship.
 */
export function useFeatureFlag(
  name: FeatureFlagName,
  fallback: string = 'control',
): string {
  const { flags, loaded } = useContext(FeatureFlagContext);
  if (!loaded) return fallback;
  return flags[name] ?? fallback;
}

/**
 * Returns true once the provider has finished its first fetch (success
 * OR failure). Useful for components that want to skip rendering until
 * the assignment is known, to avoid a flash of the fallback variant.
 */
export function useFeatureFlagsLoaded(): boolean {
  return useContext(FeatureFlagContext).loaded;
}
