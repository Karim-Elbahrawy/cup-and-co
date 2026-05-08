'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PageTransition } from '@/components/PageTransition';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';

type GenderOption = 'male' | 'female' | 'prefer_not_to_say';

const GENDER_OPTIONS: { value: GenderOption; label: string; labelAr: string }[] = [
  { value: 'male',             label: 'Male',              labelAr: 'ذكر' },
  { value: 'female',           label: 'Female',            labelAr: 'أنثى' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', labelAr: 'أفضل عدم الإفصاح' },
];

const AVATAR_PERSONALITIES = [
  { id: 1, label: 'The Scholar',      labelAr: 'المجتهد' },
  { id: 2, label: 'The Athlete',      labelAr: 'الرياضي' },
  { id: 3, label: 'The Creative',     labelAr: 'المبدع' },
  { id: 4, label: 'The Entrepreneur', labelAr: 'المحترف' },
  { id: 5, label: 'The Social',       labelAr: 'الاجتماعي' },
  { id: 6, label: 'The Chill',        labelAr: 'الهادئ' },
  { id: 7, label: 'The Coffee Lover', labelAr: 'عاشق القهوة' },
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const hydrated = useSession((s) => s.hydrated);
  const token = useSession((s) => s.token);
  const language = useSession((s) => s.language);
  const setAvatarId = useSession((s) => s.setAvatarId);
  const setGender = useSession((s) => s.setGender);

  const [avatarId, setLocalAvatarId] = useState(1);
  const [gender, setLocalGender] = useState<GenderOption>('male');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      await api.patchMe({ gender, avatar_id: avatarId });
    } catch {
      // best-effort — update local state even if the API call fails
    }
    setAvatarId(avatarId);
    setGender(gender);
    router.push('/');
  };

  const isAr = language === 'ar';

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col px-6 pb-10 pt-12">
        <header className="flex flex-col items-center text-center">
          <Logo size={44} />
        </header>

        <section className="mt-8 flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--cup-espresso)]">
            {isAr ? 'اختر شخصيتك' : 'Make it yours'}
          </h1>
          <p className="mt-1 text-sm text-[var(--cup-muted)]">
            {isAr
              ? 'اختر الأفاتار اللي يعبر عنك وحدد نوعك'
              : 'Pick the avatar that fits your vibe, then tell us who you are.'}
          </p>

          {/* Avatar grid */}
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cup-muted)]">
            {isAr ? 'الشخصية' : 'Your character'}
          </p>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {AVATAR_PERSONALITIES.map(({ id, label, labelAr }) => {
              const active = avatarId === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  onClick={() => setLocalAvatarId(id)}
                  whileTap={reduce ? undefined : { scale: 0.92 }}
                  className={[
                    'relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all',
                    active
                      ? 'border-[var(--cup-primary)] bg-[rgba(194,65,12,0.07)] shadow-[0_6px_18px_rgba(194,65,12,0.14)]'
                      : 'border-[var(--cup-stroke)] bg-white hover:border-[var(--cup-primary-tint)]',
                  ].join(' ')}
                  aria-pressed={active}
                  aria-label={isAr ? labelAr : label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/brand/avatars/avatar-${id}.svg`}
                    alt=""
                    className="h-14 w-14 object-contain"
                    draggable={false}
                  />
                  <span className="text-center text-[9px] font-semibold leading-tight text-[var(--cup-muted)]">
                    {isAr ? labelAr : label}
                  </span>
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--cup-primary)]">
                      <Check size={9} className="text-white" />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Gender */}
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cup-muted)]">
            {isAr ? 'الجنس' : 'Gender'}
          </p>
          <div className="mt-3 space-y-2.5">
            {GENDER_OPTIONS.map(({ value, label, labelAr }) => {
              const active = gender === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLocalGender(value)}
                  className={[
                    'flex w-full items-center gap-4 rounded-card border-2 bg-white p-4 text-left transition-all',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cup-primary)]',
                    active
                      ? 'border-[var(--cup-primary)] shadow-[0_4px_14px_rgba(194,65,12,0.12)]'
                      : 'border-[var(--cup-stroke)] hover:border-[var(--cup-primary-tint)]',
                  ].join(' ')}
                >
                  <span className="flex-1 font-heading text-sm font-semibold text-[var(--cup-espresso)]">
                    {isAr ? labelAr : label}
                  </span>
                  <span
                    className={[
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      active ? 'border-[var(--cup-primary)] bg-[var(--cup-primary)]' : 'border-[var(--cup-stroke)]',
                    ].join(' ')}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="pt-6">
          <PrimaryButton onClick={handleContinue} loading={submitting}>
            {isAr ? 'تابع' : 'Continue'}
            <ArrowRight size={16} aria-hidden="true" />
          </PrimaryButton>
        </div>
      </main>
    </PageTransition>
  );
}
