'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Shield, ShieldAlert, Search, Users as UsersIcon } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useSession } from '@/lib/useSession';
import { adminApi, type AdminUser } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function UsersPage() {
  const toast = useToast();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.role !== 'owner') router.replace('/');
  }, [session, router]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [blockTarget, setBlockTarget] = useState<AdminUser | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const status = filter === 'all' ? undefined : filter;
    adminApi
      .listUsers(status)
      .then((res) => {
        if (!cancelled) setUsers(res.users);
      })
      .catch((err) => toast('error', err.message))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [filter, toast]);

  async function verifyUser(id: string, status: 'approved' | 'rejected') {
    try {
      await adminApi.verifyUser(id, status);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, verification_status: status } : u)),
      );
      toast('success', `User ${status}`);
    } catch (err: unknown) {
      toast('error', (err as Error).message);
    }
  }

  async function toggleBlock(id: string, blocked: boolean) {
    try {
      await adminApi.blockUser(id, blocked);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, blocked } : u)));
      toast('success', blocked ? 'User blocked.' : 'User unblocked.');
    } catch (err: unknown) {
      toast('error', (err as Error).message);
    }
  }

  async function confirmBlockToggle() {
    if (!blockTarget) return;
    setBlockBusy(true);
    try {
      await toggleBlock(blockTarget.id, !blockTarget.blocked);
      setBlockTarget(null);
    } finally {
      setBlockBusy(false);
    }
  }

  const filters = ['all', 'pending', 'approved', 'rejected'];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      u.phone.toLowerCase().includes(q) ||
      (u.full_name?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={Boolean(blockTarget)}
        title={blockTarget?.blocked ? 'Unblock this user?' : 'Block this user?'}
        message={
          blockTarget?.blocked
            ? `${blockTarget.phone} will be able to sign in and place orders again.`
            : `${blockTarget?.phone} won't be able to sign in or place orders. You can unblock anytime.`
        }
        confirmLabel={blockTarget?.blocked ? 'Unblock' : 'Block'}
        destructive={!blockTarget?.blocked}
        busy={blockBusy}
        onConfirm={confirmBlockToggle}
        onCancel={() => !blockBusy && setBlockTarget(null)}
      />

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Directory</p>
        <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Users</h1>
        <p className="mt-1 text-sm text-cup-muted">
          Verify pending students, manage blocks, audit roles.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex flex-1 min-w-[200px] items-center">
          <Search className="absolute left-3 h-4 w-4 text-cup-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone or name…"
            className="h-10 w-full rounded-pill border border-cup-stroke bg-cup-surface pl-9 pr-3 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-pill px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === f
                  ? 'bg-cup-orange-600 text-white shadow-subtle'
                  : 'border border-cup-stroke bg-white text-cup-brown-700 hover:bg-cup-cream-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={search ? 'No users match that search.' : 'No users found.'}
          description={search ? 'Try a different phone or name.' : 'New users appear here once they sign up.'}
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-cup-stroke bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
              <tr>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Blocked</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cup-stroke">
              {filtered.map((user) => (
                <tr key={user.id} className={user.blocked ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 font-medium text-cup-brown-900">{user.phone}</td>
                  <td className="px-4 py-3 capitalize text-cup-brown-700">{user.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        user.verification_status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : user.verification_status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {user.verification_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.blocked ? (
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                    ) : (
                      <Shield className="h-4 w-4 text-green-600" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {user.verification_status === 'pending' && (
                        <>
                          <button
                            onClick={() => verifyUser(user.id, 'approved')}
                            className="flex items-center gap-1 rounded-pill bg-green-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </button>
                          <button
                            onClick={() => verifyUser(user.id, 'rejected')}
                            className="flex items-center gap-1 rounded-pill bg-red-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-red-700"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setBlockTarget(user)}
                        className={`rounded-pill px-2.5 py-1 text-[10px] font-semibold transition ${
                          user.blocked
                            ? 'border border-cup-stroke bg-white text-cup-brown-700 hover:bg-cup-cream-100'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {user.blocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
