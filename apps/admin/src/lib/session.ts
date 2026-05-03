/**
 * Cup & Co admin session helpers.
 *
 * Phase 1 stub: we don't have a real admin auth API yet, so we accept two
 * dev emails (owner@cupandco.app, barista@cupandco.app) with any non-empty
 * password and stash a tiny session blob in localStorage. The auth guard at
 * `/(authed)/layout.tsx` reads it; if missing, we redirect to /login.
 *
 * When Phase 2 wires up real Supabase Auth, replace `signIn` and `getSession`
 * with the real client; everything else (role helpers, header builders) stays.
 */

import type { UserRole } from '@cup-and-co/types';

export type AdminRole = Extract<UserRole, 'owner' | 'barista'>;

export interface AdminSession {
  email: string;
  role: AdminRole;
  /** Demo phone — used as `x-user-phone` against the dev API bypass. */
  phone: string;
  /** Stable demo id — used as `x-user-id` against the dev API bypass. */
  userId: string;
}

const SESSION_KEY = 'admin_session';

const DEMO_ACCOUNTS: Record<string, AdminSession> = {
  'owner@cupandco.app': {
    email: 'owner@cupandco.app',
    role: 'owner',
    phone: '+201000000004',
    userId: 'demo-owner',
  },
  'barista@cupandco.app': {
    email: 'barista@cupandco.app',
    role: 'barista',
    phone: '+201000000005',
    userId: 'demo-barista',
  },
};

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getSession(): AdminSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed.email || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: AdminSession): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}

/**
 * Phase 1 stub: any non-empty password works for the two demo emails.
 * Returns the session (and persists it) on success, throws on bad email.
 */
export function signIn(email: string, password: string): AdminSession {
  const trimmed = email.trim().toLowerCase();
  if (!password.trim()) throw new Error('Password is required.');
  const session = DEMO_ACCOUNTS[trimmed];
  if (!session) {
    throw new Error('Use owner@cupandco.app or barista@cupandco.app for the dev login.');
  }
  setSession(session);
  return session;
}

export function isOwner(session: AdminSession | null): boolean {
  return session?.role === 'owner';
}

export function isBarista(session: AdminSession | null): boolean {
  return session?.role === 'barista';
}
