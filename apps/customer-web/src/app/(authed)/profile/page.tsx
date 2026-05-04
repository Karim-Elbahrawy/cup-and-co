'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CreditCard,
  Fingerprint,
  History,
  KeyRound,
  LogOut,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
} from 'lucide-react';
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
  const [notifOrderUpdates, setNotifOrderUpdates] = useState(true);
  const [notifPromotions, setNotifPromotions] = useState(true);
  const [notifRewards, setNotifRewards] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [passcode, setPasscode] = useState(false);

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
      .catch(() => {});
    return () => { cancelled = true; };
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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 pt-6 pb-28">

        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            aria-label={t('common.back')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-subtle text-[var(--cup-cocoa)] hover:text-[var(--cup-primary)] transition-colors"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <h1 className="font-heading text-lg font-bold text-[var(--cup-espresso)]">
            {t('profile.account')}
          </h1>
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        {/* User hero card */}
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
              {points ?? '—'}{' '}
              <span className="text-xs font-medium text-[var(--cup-muted)]">{t('loyalty.points')}</span>
            </span>
          </div>
        </section>

        {/* Profile section */}
        <div>
          <SectionLabel>{t('profile.myProfile')}</SectionLabel>
          <div className="rounded-card bg-white shadow-card overflow-hidden">
            <NavRow icon={<User size={16} />} label={t('profile.personalInfo')} />
            <NavRow icon={<CreditCard size={16} />} label={t('profile.cardsAndPayments')} />
            <NavRow icon={<History size={16} />} label={t('profile.transactionHistory')} />
            <NavRow icon={<Shield size={16} />} label={t('profile.privacyAndData')} />
            <NavRow icon={<Tag size={16} />} label={t('profile.accountId')} last />
          </div>
        </div>

        {/* Security section */}
        <div>
          <SectionLabel>{t('profile.security')}</SectionLabel>
          <div className="rounded-card bg-white shadow-card overflow-hidden">
            <ToggleRow
              icon={<ShieldCheck size={16} />}
              label={t('profile.twoFactor')}
              checked={twoFactor}
              onChange={setTwoFactor}
            />
            <ToggleRow
              icon={<Fingerprint size={16} />}
              label={t('profile.faceId')}
              sublabel={t('profile.iOSOnly')}
              checked={false}
              onChange={() => {}}
              disabled
            />
            <ToggleRow
              icon={<KeyRound size={16} />}
              label={t('profile.passcode')}
              checked={passcode}
              onChange={setPasscode}
              last
            />
          </div>
        </div>

        {/* Notification Preferences section */}
        <div>
          <SectionLabel>{t('profile.notificationPreferences')}</SectionLabel>
          <div className="rounded-card bg-white shadow-card overflow-hidden">
            <ToggleRow
              icon={<Bell size={16} />}
              label={t('profile.orderUpdates')}
              checked={notifOrderUpdates}
              onChange={setNotifOrderUpdates}
            />
            <ToggleRow
              icon={<Tag size={16} />}
              label={t('profile.promotions')}
              checked={notifPromotions}
              onChange={setNotifPromotions}
            />
            <ToggleRow
              icon={<Sparkles size={16} />}
              label={t('profile.pointsAndRewards')}
              checked={notifRewards}
              onChange={setNotifRewards}
              last
            />
          </div>
        </div>

        {/* Language */}
        <div>
          <SectionLabel>{t('profile.language')}</SectionLabel>
          <div className="rounded-card bg-white shadow-card p-4">
            <div role="radiogroup" aria-label={t('profile.language')} className="flex gap-2">
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
                      'flex-1 rounded-2xl py-2.5 text-sm font-bold transition-all',
                      active
                        ? 'bg-[var(--cup-primary)] text-white shadow-subtle'
                        : 'bg-[var(--cup-paper)] text-[var(--cup-muted)] hover:text-[var(--cup-cocoa)]',
                    ].join(' ')}
                  >
                    {lang === 'en' ? 'English' : 'العربية'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Log out */}
        <div className="pt-1">
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--cup-muted)]">
      {children}
    </p>
  );
}

function NavRow({
  icon,
  label,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      className={[
        'flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-[var(--cup-paper)] active:bg-[var(--cup-paper)]',
        !last ? 'border-b border-[var(--cup-stroke)]' : '',
      ].join(' ')}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cup-cream)] text-[var(--cup-primary)]">
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold text-[var(--cup-espresso)]">{label}</span>
      <ChevronRight size={16} className="text-[var(--cup-muted)]" aria-hidden="true" />
    </button>
  );
}

function ToggleRow({
  icon,
  label,
  sublabel,
  checked,
  onChange,
  disabled = false,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3.5',
        !last ? 'border-b border-[var(--cup-stroke)]' : '',
      ].join(' ')}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cup-paper)] text-[var(--cup-muted)]">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[var(--cup-espresso)]">{label}</span>
        {sublabel ? (
          <span className="text-xs text-[var(--cup-muted)]">{sublabel}</span>
        ) : null}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} ariaLabel={label} />
    </div>
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
