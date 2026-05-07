'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Campus } from '@cup-and-co/types';
import { adminApi } from '@/lib/api';
import { getStoredCampusId, setStoredCampusId } from '@/lib/campus';

interface CampusContextValue {
  /** All active campuses fetched from /campuses. `null` while loading. */
  campuses: Campus[] | null;
  /** The id of the currently-selected campus. `null` until campuses load. */
  currentId: string | null;
  /** Convenience: the Campus object whose id matches currentId, or null. */
  current: Campus | null;
  setCampusId: (id: string) => void;
  /** True only after the first /campuses fetch completes (success OR fail). */
  ready: boolean;
}

const CampusContext = createContext<CampusContextValue | null>(null);

export function CampusProvider({ children }: { children: ReactNode }) {
  const [campuses, setCampuses] = useState<Campus[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(getStoredCampusId());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listCampuses()
      .then((res) => {
        if (cancelled) return;
        const list = res.campuses;
        setCampuses(list);
        // Initialize current selection: stored value if still valid, else
        // first active campus. Avoids a flicker where a stale localStorage
        // value points at a deactivated campus.
        const stored = getStoredCampusId();
        const valid = list.find((c) => c.id === stored && c.is_active);
        const fallback = list.find((c) => c.is_active) ?? list[0] ?? null;
        const chosen = valid ?? fallback;
        if (chosen) {
          setCurrentId(chosen.id);
          setStoredCampusId(chosen.id);
        }
      })
      .catch(() => {
        // Network failure — keep the stored id (if any) so subsequent
        // requests still send a campus header. The dropdown shows
        // "loading…" indefinitely; user can refresh.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const setCampusId = (id: string) => {
    setCurrentId(id);
    setStoredCampusId(id);
  };

  const value = useMemo<CampusContextValue>(() => {
    const current = campuses?.find((c) => c.id === currentId) ?? null;
    return { campuses, currentId, current, setCampusId, ready };
  }, [campuses, currentId, ready]);

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function useCampus(): CampusContextValue {
  const ctx = useContext(CampusContext);
  if (!ctx) {
    throw new Error('useCampus must be used inside <CampusProvider>');
  }
  return ctx;
}
