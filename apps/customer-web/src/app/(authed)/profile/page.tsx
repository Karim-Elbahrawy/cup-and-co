'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Fingerprint, Globe, LogOut, Sparkles } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { PrimaryButton } from '@/components/PrimaryButton';
import { UserAvatar } from '@/components/UserAvatar';
import { useSession, type Language } from '@/lib/session';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { t, language } = useT();

  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const setLanguage = useSession((s) => s.setLanguage);
  const setFullName = useSession((s) => s.setFullName);
  const logout = useSession((s) => s.logout);

  const [points, setPoints] = useState<number | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);

  // Load `/me` to refresh the session user + points balance.
  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((data) => {
        if (cancelled) return;
        setPoints(data.points);
        if (data.user)
          setUser({
            ...data.user,
            fullName: user?.fullName,
            avatarUrl: user?.avatarUrl ?? data.user.avatarUrl ?? null,
            languagePref: language,
          });
      })
      .catch(() => {
        // Silent — keeps cached session usable when the API is offline.
      });
    return () => {
      cancelled = true;
    };
    // We intentionally only run this on mount; the language effect doesn't
    // need a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const switchLang = (next: Language) => {
    setLanguage(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    }
  };

  if (!user) return null;

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 pt-6">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            aria-label={t('common.back')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-subtle text-[var(--cup-cocoa)] hover:text-[var(--cup-primary)] transition-colors"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <h1 className="font-heading text-lg font-bold text-[var(--cup-espresso)]">
            {t('profile.myProfile')}
          </h1>
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        {/* Profile card */}
        <section className="rounded-card bg-white p-5 shadow-card">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={user.fullName ?? user.phone}
              phone={user.phone}
              avatarUrl={user.avatarUrl ?? null}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={user.fullName ?? ''}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Add your name"
                aria-label="Full name"
                className="w-full bg-transparent font-heading text-lg font-bold text-[var(--cup-espresso)] placeholder:text-[var(--cup-muted)] outline-none focus:underline focus:decoration-[var(--cup-primary)] focus:underline-offset-4"
              />
              <p className="mt-0.5 text-sm text-[var(--cup-muted)]">{user.phone}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-[var(--cup-cream)] px-2.5 py-1 text-xs font-semibold text-[var(--cup-primary)]">
                <Sparkles size={12} aria-hidden="true" />
                {t(`roles.${user.role === 'owner' || user.role === 'barista' ? 'student' : user.role}`)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--cup-paper)] p-3">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--cup-muted)]">
              {t('loyalty.pointsBalance')}
            </span>
            <span className="font-heading text-lg font-bold text-[var(--cup-espresso)]">
              {points ?? '—'} <span className="text-xs font-medium text-[var(--cup-muted)]">{t('loyalty.points')}</span>
            </span>
          </div>
        </section>

        {/* Settings list */}
        <section className="rounded-card bg-white shadow-card">
          {/* Language toggle */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--cup-stroke)] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cup-accent-tint)] text-[var(--cup-accent)]">
                <Globe size={16} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-[var(--cup-espresso)]">
                {t('profile.language')}
              </span>
            </div>
            <div role="radiogroup" aria-label={t('profile.language')} className="flex rounded-pill bg-[var(--cup-paper)] p-1">
              {(['en', 'ar'] as const).map((lang) => {
                const active = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => switchLang(lang)}
                    className={[
                      'rounded-pill px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all',
                      active
                        ? 'bg-white text-[var(--cup-primary)] shadow-subtle'
                        : 'text-[var(--cup-muted)] hover:text-[var(--cup-cocoa)]',
                    ].join(' ')}
                  >
                    {lang === 'en' ? 'EN' : 'AR'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Face ID (disabled) */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--cup-stroke)] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cup-paper)] text-[var(--cup-muted)]">
                <Fingerprint size={16} aria-hidden="true" />
              </span>
              <div>
                <span className="block text-sm font-semibold text-[var(--cup-espresso)]">
                  {t('profile.faceId')}
                </span>
                <span className="text-xs text-[var(--cup-muted)]">{t('profile.iOSOnly')}</span>
              </div>
            </div>
            <ToggleSwitch checked={false} disabled onChange={() => {}} ariaLabel={t('profile.faceId')} />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cup-cream)] text-[var(--cup-primary)]">
                <Bell size={16} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-[var(--cup-espresso)]">
                {t('profile.notifications')}
              </span>
            </div>
            <ToggleSwitch
              checked={notifEnabled}
              onChange={setNotifEnabled}
              ariaLabel={t('profile.notifications')}
            />
          </div>
        </section>

        <div className="pt-2">
          <PrimaryButton
            variant="ghost"
            onClick={handleLogout}
            className="!text-[var(--cup-error)] hover:!text-[var(--cup-error)] hover:!border-[var(--cup-error)]"
          >
            <LogOut size={16} aria-hidden="true" />
            {t('auth.logout')}
          </PrimaryButton>
        </div>
      </main>
    </PageTransition>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cup-primary)] focus-visible:ring-offset-2',
        checked ? 'bg-[var(--cup-primary)]' : 'bg-[var(--cup-stroke)]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-subtle transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
