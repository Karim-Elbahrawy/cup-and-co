'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PageTransition } from '@/components/PageTransition';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

const EGYPT_DIAL_CODE = '+20';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const hydrated = useSession((s) => s.hydrated);
  const token = useSession((s) => s.token);

  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, jump straight to the home page.
  useEffect(() => {
    if (hydrated && token) router.replace('/');
  }, [hydrated, token, router]);

  // Egyptian numbers: 11 digits including the leading 1 (we strip the 0 the
  // user might paste). After normalization we always send `+201XXXXXXXXX`.
  const normalize = (raw: string) => raw.replace(/\D/g, '').replace(/^0/, '');
  const localDigits = normalize(phone);
  const valid = localDigits.length === 10 && localDigits.startsWith('1');

  const fullPhone = `${EGYPT_DIAL_CODE}${localDigits}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.sendOtp(fullPhone);
      const params = new URLSearchParams({ phone: fullPhone });
      router.push(`/verify?${params.toString()}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('common.error');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col px-6 pb-10 pt-12 md:min-h-[calc(100vh-3rem)] md:pt-10">
        <header className="flex flex-col items-center text-center">
          <Logo showWordmark size={56} />
        </header>

        <section className="mx-auto mt-12 w-full max-w-md flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--cup-espresso)]">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-[var(--cup-muted)]">
            Enter your phone number — we&apos;ll text you a code to sign in.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cup-muted)]">
                {t('auth.phoneNumber')}
              </span>
              <div className="mt-2 flex items-stretch gap-2">
                <button
                  type="button"
                  aria-label="Country code: Egypt +20"
                  className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-[var(--cup-stroke)] bg-white px-3 text-sm font-semibold text-[var(--cup-espresso)] cursor-default"
                  tabIndex={-1}
                >
                  <span aria-hidden="true" className="text-base">
                    {/* Egypt flag emoji */}
                    🇪🇬
                  </span>
                  {EGYPT_DIAL_CODE}
                </button>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--cup-muted)]">
                    <Phone size={16} aria-hidden="true" />
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    autoFocus
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError(null);
                    }}
                    placeholder="100 000 0001"
                    aria-label="Phone number"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-error' : 'login-hint'}
                    className="h-12 w-full rounded-2xl border border-[var(--cup-stroke)] bg-white ps-10 pe-4 text-base font-medium tracking-wide text-[var(--cup-espresso)] outline-none transition-all focus:border-[var(--cup-primary)] focus:shadow-[0_0_0_4px_rgba(194,65,12,0.10)]"
                  />
                </div>
              </div>
            </label>

            {error ? (
              <p id="login-error" role="alert" className="text-sm font-medium text-[var(--cup-error)]">
                {error}
              </p>
            ) : null}

            <PrimaryButton type="submit" loading={submitting} disabled={!valid}>
              {t('auth.sendCode')}
              <ArrowRight size={16} aria-hidden="true" />
            </PrimaryButton>

            <p id="login-hint" className="rounded-2xl bg-[var(--cup-cream)] p-3 text-xs leading-relaxed text-[var(--cup-cocoa)]">
              <strong className="font-semibold text-[var(--cup-espresso)]">Demo:</strong> any 11-digit Egyptian phone works in dev. Try
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">+201000000001</code>
              through
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">…05</code>.
            </p>
          </form>
        </section>

        <footer className="pt-6 text-center text-xs text-[var(--cup-muted)]">
          By continuing you agree to our Terms &amp; Privacy.
        </footer>
      </main>
    </PageTransition>
  );
}
