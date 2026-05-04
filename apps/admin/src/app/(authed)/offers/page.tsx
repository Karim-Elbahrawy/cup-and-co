'use client';

import { useEffect, useState } from 'react';
import { Plus, Tag, Calendar, Users } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { adminApi, type AdminOffer } from '@/lib/api';

const ROLES = ['student', 'faculty', 'office'] as const;

export default function OffersPage() {
  const toast = useToast();
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    name_en: string;
    name_ar: string;
    type: 'percentage' | 'fixed' | 'free_item';
    value: number;
    starts_at: string;
    ends_at: string;
    target_roles: string[];
    code: string;
    usage_limit: string;
  }>({
    name_en: '',
    name_ar: '',
    type: 'percentage',
    value: 0,
    starts_at: '',
    ends_at: '',
    target_roles: ['student'],
    code: '',
    usage_limit: '',
  });

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listOffers()
      .then((res) => {
        if (!cancelled) setOffers(res.offers);
      })
      .catch((err) => toast('error', err.message))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = {
        ...form,
        value: Number(form.value),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        code: form.code || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      };
      const created = await adminApi.createOffer(body as Omit<AdminOffer, 'id' | 'usage_count'>);
      setOffers((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({
        name_en: '', name_ar: '', type: 'percentage', value: 0,
        starts_at: '', ends_at: '', target_roles: ['student'],
        code: '', usage_limit: '',
      });
      toast('success', 'Offer created');
    } catch (err: unknown) {
      toast('error', (err as Error).message);
    }
  }

  function toggleRole(role: string) {
    setForm((prev) => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role],
    }));
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-cup-muted">
        Loading offers…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cup-brown-900">Offers</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 rounded-pill bg-cup-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-warm-glow transition hover:bg-cup-orange-700"
        >
          <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'New Offer'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-cup-stroke bg-white p-6 shadow-sm space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-cup-brown-700">Name (EN)</label>
              <input
                required
                value={form.name_en}
                onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-cup-brown-700">Name (AR)</label>
              <input
                required
                value={form.name_ar}
                onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
                dir="rtl"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-cup-brown-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'percentage' | 'fixed' | 'free_item' }))}
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="free_item">Free Item</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-cup-brown-700">Value</label>
              <input
                type="number"
                min={0}
                required
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-cup-brown-700">Starts At</label>
              <input
                type="datetime-local"
                required
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-cup-brown-700">Ends At</label>
              <input
                type="datetime-local"
                required
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-cup-brown-700">Coupon Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-cup-brown-700">Usage Limit</label>
              <input
                type="number"
                min={0}
                value={form.usage_limit}
                onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-cup-brown-700">Target Roles</label>
            <div className="flex gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-pill px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    form.target_roles.includes(role)
                      ? 'bg-cup-orange-600 text-white'
                      : 'border border-cup-stroke bg-white text-cup-brown-700 hover:bg-cup-cream-100'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-pill bg-cup-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-warm-glow transition hover:bg-cup-orange-700"
            >
              Create Offer
            </button>
          </div>
        </form>
      )}

      {offers.length === 0 ? (
        <div className="rounded-card border border-cup-stroke bg-white p-12 text-center text-cup-muted">
          No offers yet. Create your first offer above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => {
            const isActive = new Date(offer.starts_at) <= new Date() && new Date(offer.ends_at) >= new Date();
            const isUpcoming = new Date(offer.starts_at) > new Date();
            return (
              <div
                key={offer.id}
                className="rounded-card border border-cup-stroke bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-cup-orange-600" />
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        isActive
                          ? 'bg-green-100 text-green-700'
                          : isUpcoming
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-cup-brown-100 text-cup-muted'
                      }`}
                    >
                      {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Expired'}
                    </span>
                  </div>
                </div>
                <h3 className="mt-2 text-sm font-bold text-cup-brown-900">{offer.name_en}</h3>
                <p className="text-xs text-cup-muted" dir="rtl">{offer.name_ar}</p>
                <div className="mt-3 space-y-1 text-xs text-cup-brown-700">
                  <p className="flex items-center gap-1">
                    <Tag className="h-3 w-3" /> {offer.type === 'percentage' ? `${offer.value}% off` : offer.type === 'fixed' ? `${offer.value} EGP off` : 'Free item'}
                  </p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(offer.starts_at).toLocaleDateString()} – {new Date(offer.ends_at).toLocaleDateString()}
                  </p>
                  <p className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {offer.target_roles.join(', ')}
                  </p>
                  {offer.code && (
                    <p className="font-mono text-cup-orange-700">Code: {offer.code}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
