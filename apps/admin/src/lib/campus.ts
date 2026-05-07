/**
 * Admin campus selection — Phase 2.3 of UPGRADE-PLAN.md.
 *
 * Tracks which campus the staff member is currently viewing. Persists to
 * localStorage so a refresh keeps the selection. The current selection is
 * forwarded to the API as `x-admin-campus-id` on every request — when the
 * server-side API moves off in-memory state and starts filtering admin
 * lists by campus, no further admin-side change is needed.
 *
 * For super-admins (no `staff_users.campus_id` assignment) the dropdown
 * lists every active campus. For campus-scoped staff the dropdown is
 * single-value (just their assigned campus). v1.5 has one campus seeded,
 * so the dropdown is informational.
 */

import type { Campus } from '@cup-and-co/types';

const CAMPUS_KEY = 'admin_current_campus_id';

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredCampusId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(CAMPUS_KEY);
  } catch {
    return null;
  }
}

export function setStoredCampusId(id: string | null): void {
  if (!isBrowser()) return;
  if (id === null) {
    window.localStorage.removeItem(CAMPUS_KEY);
  } else {
    window.localStorage.setItem(CAMPUS_KEY, id);
  }
}

/**
 * Helper that decides whether the dropdown is interactive. Defensive
 * against a server-injected list mismatch (shouldn't happen but cheap to
 * guard).
 */
export function shouldShowSwitcher(campuses: Campus[]): boolean {
  return campuses.filter((c) => c.is_active).length > 1;
}
