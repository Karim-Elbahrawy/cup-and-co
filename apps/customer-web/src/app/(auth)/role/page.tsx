'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GraduationCap, BookOpen, Briefcase, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PageTransition } from '@/components/PageTransition';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

type SelectableRole = 'student' | 'faculty' | 'office';

interface Option {
  role: SelectableRole;
  icon: LucideIcon;
  // Tailwind classes can't be templated dynamically — these tints come from
  // the design tokens but are spelled out per role for predictable styling.
  tintFrom: string;
  tintTo: string;
}

const OPTIONS: Option[] = [
  { role: 'student', icon: GraduationCap, tintFrom: '#FED7AA', tintTo: '#FFF7ED' },
  { role: 'faculty', icon: BookOpen,      tintFrom: '#CCFBF1', tintTo: '#F0FDFA' },
  { role: 'office',  icon: Briefcase,     tintFrom: '#FEF3C7', tintTo: '#FFFBF5' },
];

export default function RolePage() {
  const router = useRouter();
  const { t } = useT();
  const reduce = useReducedMotion();
  const hydrated = useSession((s) => s.hydrated);
  const token = useSession((s) => s.token);
  const setRole = useSession((s) => s.setRole);

  const [selected, setSelected] = useState<SelectableRole>('student');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  const handleContinue = async () => {
    setSubmitting(true);
    // The API doesn't yet have a `PATCH /me` endpoint — Phase 2 wires this
    // through to Supabase. For now we stash the role client-side so the rest
    // of the app reflects the user's choice (greeting, role badge, etc.).
    setRole(selected);
    // small delay so the user perceives the action — feels intentional
    // without being annoying.
    await new Promise((r) => setTimeout(r, 200));
    router.push('/verify-id');
  };

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col px-6 pb-10 pt-12 md:min-h-[calc(100vh-3rem)] md:pt-10">
        <header className="flex flex-col items-center text-center">
          <Logo size={48} />
        </header>

        <section className="mt-10 flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--cup-espresso)]">
            {t('roles.selectRole')}
          </h1>
          <p className="mt-2 text-sm text-[var(--cup-muted)]">
            Pick the role that fits — you can change it anytime from your profile.
          </p>

          <div role="radiogroup" aria-label={t('roles.selectRole')} className="mt-8 space-y-3">
            {OPTIONS.map(({ role, icon: Icon, tintFrom, tintTo }) => {
              const active = selected === role;
              return (
                <motion.button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(role)}
                  whileTap={reduce ? undefined : { scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                  className={[
                    'flex w-full items-center gap-4 rounded-card border-2 bg-white p-4 text-left transition-all',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cup-primary)] focus-visible:ring-offset-2',
                    active
                      ? 'border-[var(--cup-primary)] shadow-[0_8px_24px_rgba(194,65,12,0.14)]'
                      : 'border-[var(--cup-stroke)] hover:border-[var(--cup-primary-tint)]',
                  ].join(' ')}
                >
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${tintFrom} 0%, ${tintTo} 100%)`,
                      color: 'var(--cup-primary)',
                    }}
                    aria-hidden="true"
                  >
                    <Icon size={24} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-heading text-base font-bold text-[var(--cup-espresso)]">
                      {t(`roles.${role}`)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[var(--cup-muted)]">
                      {t(`roles.roleDescription.${role}`)}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={[
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      active ? 'border-[var(--cup-primary)] bg-[var(--cup-primary)]' : 'border-[var(--cup-stroke)]',
                    ].join(' ')}
                  >
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        <div className="pt-6">
          <PrimaryButton onClick={handleContinue} loading={submitting}>
            Continue
            <ArrowRight size={16} aria-hidden="true" />
          </PrimaryButton>
        </div>
      </main>
    </PageTransition>
  );
}
