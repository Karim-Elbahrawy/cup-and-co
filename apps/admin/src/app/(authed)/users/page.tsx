'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Shield, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { adminApi, type AdminUser } from '@/lib/api';

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

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
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, blocked } : u)),
      );
      toast('success', blocked ? 'User blocked' : 'User unblocked');
    } catch (err: unknown) {
      toast('error', (err as Error).message);
    }
  }

  const filters = ['all', 'pending', 'approved', 'rejected'];

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-cup-muted">
        Loading users…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-cup-brown-900">Users</h1>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-pill px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === f
                  ? 'bg-cup-orange-600 text-white'
                  : 'border border-cup-stroke bg-white text-cup-brown-700 hover:bg-cup-cream-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-card border border-cup-stroke bg-white p-12 text-center text-cup-muted">
          No users found.
        </div>
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
              {users.map((user) => (
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
                        onClick={() => toggleBlock(user.id, !user.blocked)}
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
