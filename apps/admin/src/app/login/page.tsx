'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { getSession, signIn } from '@/lib/session';

/**
 * Phase 1 dev login. Accepts the two demo addresses with any non-empty
 * password. Persists the session to localStorage and redirects to `/`.
 *
 * Phase 2 will swap this for Supabase admin auth — the form will send the
 * password to the API and we'll get a real JWT back, but the redirect target
 * and session contract stay the same so the rest of the dashboard is stable.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@cupandco.app');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If somebody already has a session and lands on /login, send them home.
  useEffect(() => {
    if (getSession()) router.replace('/');
  }, [router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      signIn(email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.');
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cup-paper px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <Logo size={48} />
        </div>

        <div
          className="rounded-card border border-cup-stroke bg-cup-surface p-8 shadow-card"
          style={{ boxShadow: '0 12px 32px rgba(28, 25, 23, 0.08)' }}
        >
          <h1 className="font-heading text-2xl font-bold text-cup-brown-900">Welcome back</h1>
          <p className="mt-1 text-sm text-cup-muted">
            Sign in to run the kiosk — orders, menu, QR receipts.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">
                Email
              </span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2.5 text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 focus:ring-offset-1"
                placeholder="owner@cupandco.app"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cup-muted">
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-chip border border-cup-stroke bg-white px-3 py-2.5 text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none focus:ring-2 focus:ring-cup-orange-600 focus:ring-offset-1"
                placeholder="Any non-empty password"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-chip bg-rose-50 px-3 py-2 text-sm text-cup-error"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-pill bg-cup-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-chip bg-cup-cream-200 px-3 py-2.5 text-xs text-cup-brown-700">
            <p className="font-semibold">Dev accounts</p>
            <p className="mt-0.5 leading-relaxed">
              <code className="font-mono">owner@cupandco.app</code> · full access
              <br />
              <code className="font-mono">barista@cupandco.app</code> · operations only
              <br />
              Any non-empty password works in dev.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
