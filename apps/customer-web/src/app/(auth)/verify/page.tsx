'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { OtpInput } from '@/components/OtpInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PageTransition } from '@/components/PageTransition';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

const RESEND_SECONDS = 30;

export default function VerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useT();
  const setSession = useSession((s) => s.setSession);

  const phone = params.get('phone') ?? '';

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  // No phone in the URL → bounce back to login.
  useEffect(() => {
    if (!phone) router.replace('/login');
  }, [phone, router]);

  // Countdown timer for the "Resend code" CTA.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  const verify = useCallback(
    async (next: string) => {
      if (next.length !== 6 || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const { token, user } = await api.verifyOtp(phone, next);
        setSession(token, user);
        // First-time users land on role selection. The API stub always
        // returns role=student, so we route everyone through role selection
        // until /me is wired up properly in Phase 2.
        router.replace('/role');
      } catch (err) {
        const message = err instanceof ApiError ? err.message : t('common.error');
        setError(message);
        setCode('');
      } finally {
        setSubmitting(false);
      }
    },
    [phone, router, setSession, submitting, t],
  );

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await api.sendOtp(phone);
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setResending(false);
    }
  };

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col px-6 pb-10 pt-12 md:min-h-[calc(100vh-3rem)] md:pt-10">
        <header className="flex items-center justify-between">
          <Link
            href="/login"
            aria-label={t('common.back')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-subtle text-[var(--cup-cocoa)] hover:text-[var(--cup-primary)] transition-colors"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <Logo size={36} />
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        <section className="mt-10 flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--cup-espresso)]">
            Verify your number
          </h1>
          <p className="mt-2 text-sm text-[var(--cup-muted)]">
            {t('auth.enterOtp')}
            {phone ? (
              <>
                {' '}
                <span className="font-semibold text-[var(--cup-espresso)]">{phone}</span>.
              </>
            ) : null}
          </p>

          <div className="mt-8">
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              onComplete={verify}
              hasError={Boolean(error)}
              disabled={submitting}
            />
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-sm font-medium text-[var(--cup-error)]">
              {error}
            </p>
          ) : null}

          <p className="mt-4 rounded-2xl bg-[var(--cup-cream)] p-3 text-xs leading-relaxed text-[var(--cup-cocoa)]">
            <strong className="font-semibold text-[var(--cup-espresso)]">Dev hint:</strong> the code is always
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">000000</code>.
          </p>

          <div className="mt-8 space-y-4">
            <PrimaryButton
              type="button"
              loading={submitting}
              disabled={code.length !== 6}
              onClick={() => verify(code)}
            >
              {t('auth.verifyCode')}
            </PrimaryButton>

            <div className="text-center text-sm text-[var(--cup-muted)]">
              {secondsLeft > 0 ? (
                <span>
                  Resend in <span className="font-semibold text-[var(--cup-cocoa)]">{secondsLeft}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold text-[var(--cup-primary)] underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {resending ? `${t('common.loading')}` : t('auth.resendCode')}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
