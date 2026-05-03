'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Upload, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PageTransition } from '@/components/PageTransition';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

export default function VerifyIdPage() {
  const router = useRouter();
  const { t } = useT();
  const hydrated = useSession((s) => s.hydrated);
  const token = useSession((s) => s.token);
  const fileRef = useRef<HTMLInputElement>(null);

  const [filename, setFilename] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  const handleContinue = async () => {
    setSubmitting(true);
    // Phase 2 will upload to Supabase Storage and POST a verification
    // submission. For Phase 1 we accept the file locally and move on.
    await new Promise((r) => setTimeout(r, 240));
    router.replace('/');
  };

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col px-6 pb-10 pt-12 md:min-h-[calc(100vh-3rem)] md:pt-10">
        <header className="flex flex-col items-center text-center">
          <Logo size={48} />
        </header>

        <section className="mt-10 flex-1">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cup-accent-tint)] text-[var(--cup-accent)]">
            <ShieldCheck size={24} aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-[var(--cup-espresso)]">
            Verify your ID
          </h1>
          <p className="mt-2 text-sm text-[var(--cup-muted)]">
            Snap a quick photo of your campus ID to unlock student-exclusive offers and
            full ordering. You can also do this later.
          </p>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-6 flex w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-[var(--cup-stroke)] bg-white p-8 text-center transition-colors hover:border-[var(--cup-primary)] focus-visible:border-[var(--cup-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cup-primary)] focus-visible:ring-offset-2"
          >
            {filename ? (
              <>
                <CheckCircle2 size={28} className="text-[var(--cup-success)]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[var(--cup-espresso)]">
                  {filename}
                </span>
                <span className="text-xs text-[var(--cup-muted)]">Tap to choose a different file</span>
              </>
            ) : (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cup-cream)] text-[var(--cup-primary)]">
                  <Upload size={20} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[var(--cup-espresso)]">
                  Upload campus ID
                </span>
                <span className="text-xs text-[var(--cup-muted)]">PNG, JPG, or HEIC up to 10MB</span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setFilename(file.name);
            }}
          />
        </section>

        <div className="space-y-3 pt-6">
          <PrimaryButton onClick={handleContinue} loading={submitting}>
            {filename ? 'Submit & continue' : t('auth.skipForNow')}
            <ArrowRight size={16} aria-hidden="true" />
          </PrimaryButton>
          {filename ? (
            <button
              type="button"
              onClick={() => setFilename(null)}
              className="block w-full text-center text-sm font-medium text-[var(--cup-muted)] hover:text-[var(--cup-cocoa)]"
            >
              Remove file
            </button>
          ) : null}
        </div>
      </main>
    </PageTransition>
  );
}
