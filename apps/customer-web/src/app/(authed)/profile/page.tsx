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
  MapPin,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
} from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { PrimaryButton } from '@/components/PrimaryButton';
import { UserAvatar } from '@/components/UserAvatar';
import { TierBadge, TierProgress } from '@/components/TierBadge';
import { useSession, type Language } from '@/lib/session';
import { useT } from '@/lib/i18n';
import { api, type LoyaltyTier, type TierBenefits } from '@/lib/api';
import { useTheme, type ThemeChoice } from '@/components/ThemeProvider';

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
  // Phase 6.3 — tier state
  const [tier, setTier] = useState<{
    tier: LoyaltyTier;
    nextTier: LoyaltyTier | null;
    pointsToNext: number | null;
    trailing12mPoints: number;
    benefits: TierBenefits;
  } | null>(null);

  // Phase 8.2 — appearance
  const { choice: themeChoice, setChoice: setThemeChoice } = useTheme();

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
    api
      .myTier()
      .then((res) => {
        if (cancelled) return;
        setTier({
          tier: res.tier,
          nextTier: res.nextTier,
          pointsToNext: res.pointsToNext,
          trailing12mPoints: res.trailing12mPoints,
          benefits: res.benefits,
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
                onBlur={async (e) => {
                  const trimmed = e.target.value.trim();
                  if (!trimmed || trimmed === user.fullName) return;
                  try {
                    const res = await api.patchMe({ full_name: trimmed });
                    if (res.user) setUser(res.user);
                  } catch {
                    // Keep local edit; user can retry on next blur
                  }
                }}
                placeholder="Add your name"
                aria-label="Full name"
                className="w-full bg-transparent font-heading text-lg font-bold text-[var(--cup-espresso)] placeholder:text-[var(--cup-muted)] outline-none focus:underline focus:decoration-[var(--cup-primary)] focus:underline-offset-4"
              />
              <p className="mt-0.5 text-sm text-[var(--cup-muted)]">{user.phone}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-[var(--cup-cream)] px-2.5 py-1 text-xs font-semibold text-[var(--cup-primary)]">
                  <Sparkles size={12} aria-hidden="true" />
                  {t(`roles.${user.role === 'owner' || user.role === 'barista' ? 'student' : user.role}`)}
                </span>
                {tier && <TierBadge tier={tier.tier} size="sm" language={language} />}
              </div>
            </div>
          </div>

          {/* Phase 6.3 — tier progress */}
          {tier && (
            <div className="mt-4 rounded-2xl bg-[var(--cup-paper)] p-3">
              <TierProgress
                currentTier={tier.tier}
                nextTier={tier.nextTier}
                trailing12mPoints={tier.trailing12mPoints}
                pointsToNext={tier.pointsToNext}
                language={language}
              />
              {/* Benefits summary */}
              <ul className="mt-3 space-y-1 text-[11px] text-[var(--cup-cocoa)]">
                {tier.benefits.multiplier > 1 && (
                  <li>
                    {language === 'ar'
                      ? `× ${tier.benefits.multiplier} نقاط`
                      : `${tier.benefits.multiplier}× points multiplier`}
                  </li>
                )}
                {tier.benefits.freeUpsizesPerMonth > 0 && (
                  <li>
                    {language === 'ar'
                      ? `${tier.benefits.freeUpsizesPerMonth} ترقيات مجانية/شهر`
                      : `${tier.benefits.freeUpsizesPerMonth} free upsize${tier.benefits.freeUpsizesPerMonth === 1 ? '' : 's'} / month`}
                  </li>
                )}
                {tier.benefits.birthdayDrinkFree && (
                  <li>
                    {language === 'ar' ? 'مشروب عيد ميلاد مجاني' : 'Free birthday drink'}
                  </li>
                )}
              </ul>
            </div>
          )}

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
            {/* Phase R.4 (B) — visible-but-disabled "Coming soon" stubs.
                The underlying flows (personal-info edit, saved cards,
                transaction history) ship in Phases 1.5/3.x; the rows are
                here so the surface is screenshot-ready. */}
            <NavRow
              icon={<User size={16} />}
              label={t('profile.personalInfo')}
              comingSoon
            />
            <NavRow
              icon={<CreditCard size={16} />}
              label={t('profile.cardsAndPayments')}
              comingSoon
            />
            <NavRow
              icon={<History size={16} />}
              label={t('profile.transactionHistory')}
              comingSoon
            />
            <NavRow icon={<Tag size={16} />} label={t('profile.accountId')} />
            <NavRow
              icon={<MapPin size={16} />}
              label={t('campus.title')}
              href="/profile/campus"
            />
            <NavRow
              icon={<Shield size={16} />}
              label={t('profile.privacyAndData')}
              href="/profile/privacy"
              last
            />
          </div>
        </div>

        {/* Phase R.4 (B) — Security section, restored as visible-but-disabled
            stubs. The toggles read state but `disabled` blocks any flip;
            actual 2FA / Face ID / Passcode flows land in Phase 1.x. */}
        <div>
          <SectionLabel>{t('profile.security')}</SectionLabel>
          <div className="rounded-card bg-white shadow-card overflow-hidden">
            <ToggleRow
              icon={<ShieldCheck size={16} />}
              label={t('profile.twoFactor')}
              checked={twoFactor}
              onChange={setTwoFactor}
              disabled
              comingSoon
            />
            <ToggleRow
              icon={<Fingerprint size={16} />}
              label={t('profile.faceId')}
              sublabel={t('profile.iOSOnly')}
              checked={false}
              onChange={() => {}}
              disabled
              comingSoon
            />
            <ToggleRow
              icon={<KeyRound size={16} />}
              label={t('profile.passcode')}
              checked={passcode}
              onChange={setPasscode}
              disabled
              comingSoon
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

        {/* Phase 8.2 — Appearance */}
        <div>
          <SectionLabel>{language === 'ar' ? 'المظهر' : 'Appearance'}</SectionLabel>
          <div className="rounded-card bg-[var(--cup-surface)] shadow-card p-4">
            <div role="radiogroup" aria-label={language === 'ar' ? 'المظهر' : 'Appearance'} className="flex gap-2">
              {(['system', 'light', 'dark'] as const).map((mode) => {
                const active = themeChoice === mode;
                const label = (() => {
                  const isAr = language === 'ar';
                  if (mode === 'system') return isAr ? 'النظام' : 'System';
                  if (mode === 'light') return isAr ? 'فاتح' : 'Light';
                  return isAr ? 'داكن' : 'Dark';
                })();
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setThemeChoice(mode as ThemeChoice)}
                    className={[
                      'flex-1 rounded-2xl py-2.5 text-sm font-bold transition-all',
                      active
                        ? 'bg-[var(--cup-primary)] text-white shadow-subtle'
                        : 'bg-[var(--cup-paper)] text-[var(--cup-muted)] hover:text-[var(--cup-cocoa)]',
                    ].join(' ')}
                  >
                    {label}
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
  href,
  last = false,
  comingSoon = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  last?: boolean;
  /** Phase R.4 (B) — render as a visually-present, non-interactive
   *  row with a "Coming soon" pill. Suppresses the chevron/link. */
  comingSoon?: boolean;
}) {
  const className = [
    'flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors',
    comingSoon
      ? 'cursor-not-allowed opacity-60'
      : 'hover:bg-[var(--cup-paper)] active:bg-[var(--cup-paper)]',
    !last ? 'border-b border-[var(--cup-stroke)]' : '',
  ].join(' ');
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cup-cream)] text-[var(--cup-primary)]">
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold text-[var(--cup-espresso)]">{label}</span>
      {comingSoon ? (
        <ComingSoonPill />
      ) : (
        <ChevronRight size={16} className="text-[var(--cup-muted)]" aria-hidden="true" />
      )}
    </>
  );
  if (comingSoon) {
    return (
      <div role="presentation" className={className} aria-disabled="true">
        {inner}
      </div>
    );
  }
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={className}>
      {inner}
    </button>
  );
}

/** Phase R.4 (B) — small "Coming soon" pill used by the disabled
 *  Profile rows / Security toggles. No new primitive on purpose;
 *  this is the only spot in the app that needs it today. */
function ComingSoonPill() {
  return (
    <span className="rounded-full bg-[var(--cup-cream)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--cup-cocoa)]">
      Coming soon
    </span>
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
  comingSoon = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
  /** Phase R.4 (B) — show a "Coming soon" pill alongside the label.
   *  Implies disabled visually; callers still pass `disabled` so the
   *  switch is also un-flippable for assistive tech. */
  comingSoon?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3.5',
        !last ? 'border-b border-[var(--cup-stroke)]' : '',
        comingSoon ? 'opacity-70' : '',
      ].join(' ')}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cup-paper)] text-[var(--cup-muted)]">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--cup-espresso)]">
          <span>{label}</span>
          {comingSoon ? <ComingSoonPill /> : null}
        </span>
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
