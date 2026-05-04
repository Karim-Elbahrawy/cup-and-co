import type { UserRole } from '@cup-and-co/types';

export type AdminRole = Extract<UserRole, 'owner' | 'barista'>;

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

const ownerPermissions = new Set<AdminPermission>([
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

const baristaPermissions = new Set<AdminPermission>([
  'orders:update_status',
  'menu:update_availability',
  'kiosk:update_open_status',
  'qr_receipts:create',
  'reports:view_today',
]);

export function assertAdminPermission(role: AdminRole, permission: AdminPermission): void {
  const allowed = role === 'owner' ? ownerPermissions : baristaPermissions;
  if (!allowed.has(permission)) {
    const e = new Error(`This action requires owner permission: ${permission}`) as Error & { status?: number };
    e.status = 403;
    throw e;
  }
}

export function listAdminPermissions(role: AdminRole): AdminPermission[] {
  return Array.from(role === 'owner' ? ownerPermissions : baristaPermissions);
}
