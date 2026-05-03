import { describe, expect, it } from 'vitest';
import { assertAdminPermission, listAdminPermissions } from './permissions.js';

describe('permissions', () => {
  it('owner has all permissions', () => {
    const perms = listAdminPermissions('owner');
    expect(perms).toContain('reports:view_full');
    expect(perms).toContain('users:block');
    expect(perms).toContain('staff:manage');
    expect(perms).toContain('refunds:manage');
  });

  it('barista has limited permissions', () => {
    const perms = listAdminPermissions('barista');
    expect(perms).toContain('orders:update_status');
    expect(perms).toContain('menu:update_availability');
    expect(perms).toContain('qr_receipts:create');
    expect(perms).not.toContain('users:block');
    expect(perms).not.toContain('reports:view_full');
    expect(perms).not.toContain('staff:manage');
  });

  it('asserts owner can settle leaderboard', () => {
    expect(() => assertAdminPermission('owner', 'leaderboard:settle')).not.toThrow();
  });

  it('asserts barista cannot settle leaderboard', () => {
    expect(() => assertAdminPermission('barista', 'leaderboard:settle')).toThrow(
      /requires owner permission/,
    );
  });

  it('barista can update order status', () => {
    expect(() => assertAdminPermission('barista', 'orders:update_status')).not.toThrow();
  });

  it('barista cannot block users', () => {
    expect(() => assertAdminPermission('barista', 'users:block')).toThrow();
  });
});
