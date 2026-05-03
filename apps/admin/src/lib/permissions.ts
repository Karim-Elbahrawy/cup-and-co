/**
 * Mirror of `apps/api/src/services/permissions.ts` so the admin UI can hide
 * controls that the API would reject anyway.
 *
 * Keep this in sync if the API matrix changes — there's no shared package for
 * permissions yet (Phase 4 will hoist it into `packages/types`).
 */

import type { AdminRole } from './session';

export type AdminPermission =
  | 'orders:update_status'
  | 'menu:update_availability'
  | 'menu:manage'
  | 'kiosk:update_open_status'
  | 'kiosk:settings'
  | 'qr_receipts:create'
  | 'reports:view_today'
  | 'reports:view_full'
  | 'users:verify'
  | 'users:block'
  | 'staff:manage'
  | 'offers:manage'
  | 'loyalty:manage'
  | 'reviews:manage'
  | 'leaderboard:settle'
  | 'refunds:manage';

const OWNER_PERMISSIONS: ReadonlySet<AdminPermission> = new Set([
  'orders:update_status',
  'menu:update_availability',
  'menu:manage',
  'kiosk:update_open_status',
  'kiosk:settings',
  'qr_receipts:create',
  'reports:view_today',
  'reports:view_full',
  'users:verify',
  'users:block',
  'staff:manage',
  'offers:manage',
  'loyalty:manage',
  'reviews:manage',
  'leaderboard:settle',
  'refunds:manage',
]);

const BARISTA_PERMISSIONS: ReadonlySet<AdminPermission> = new Set([
  'orders:update_status',
  'menu:update_availability',
  'kiosk:update_open_status',
  'qr_receipts:create',
  'reports:view_today',
]);

export function can(role: AdminRole | undefined, permission: AdminPermission): boolean {
  if (!role) return false;
  const allowed = role === 'owner' ? OWNER_PERMISSIONS : BARISTA_PERMISSIONS;
  return allowed.has(permission);
}

export function permissionsFor(role: AdminRole): AdminPermission[] {
  return Array.from(role === 'owner' ? OWNER_PERMISSIONS : BARISTA_PERMISSIONS);
}
