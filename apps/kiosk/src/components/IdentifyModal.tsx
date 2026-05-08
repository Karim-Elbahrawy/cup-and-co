'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, ChevronLeft, Check } from 'lucide-react';
import { BigButton } from './BigButton';
import { useLang } from '@/lib/useLang';
import { useIdentified, type IdentifiedCustomer } from '@/lib/useIdentified';
import { api, ApiError } from '@/lib/api';

/**
 * Identify modal (K4.4) — opt-in phone+OTP flow.
 *
 * Three internal phases:
 *   1. 'phone' — numeric keypad to enter the phone (defaults +20 prefix
 *      for Egypt; the user can edit if they're roaming).
 *   2. 'otp'   — numeric keypad for the 6-digit code.
 *   3. 'done'  — "Welcome back, [name]!" then auto-closes after 1.4s.
 *
 * On success we call /me with the new JWT to fetch tier + points snapshot,
 * stash everything in useIdentified, and dismiss.
 *
 * Uses a custom keypad rather than `<input type="tel">` so we don't trigger
 * the iPad system keyboard — kiosks should never show OS keyboards.
 *
 * Per docs/KIOSK-PLAN.md K4.4.
 */

interface IdentifyModalProps {
  open: boolean;
  onClose: () => void;
}

type Phase = 'phone' | 'otp' | 'done';

export function IdentifyModal({ open, onClose }: IdentifyModalProps) {
  const lang = useLang((s) => s.lang);
  const setIdentified = useIdentified((s) => s.set);
  const [phase, setPhase] = useState<Phase>('phone');
  // We hold just the local digits and prepend '+20' on submission. Lets the
  // keypad be smaller + the spec is fine with 'Egyptian-only' for v1.
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otpDigits, setOtpDigits] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  // Reset on close — when reopened the customer starts fresh.
  useEffect(() => {
    if (!open) {
      setPhase('phone');
      setPhoneDigits('');
      setOtpDigits('');
      setSubmitting(false);
      setError(null);
      setWelcomeName(null);
    }
  }, [open]);

  const phoneFull = phoneDigits ? `+20${phoneDigits}` : '';
  const phoneValid = phoneDigits.length >= 9 && phoneDigits.length <= 11;
  const otpValid = otpDigits.length === 6;

  async function submitPhone() {
    if (!phoneValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.sendOtp(phoneFull);
      setPhase('otp');
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : lang === 'ar'
            ? 'تعذّر إرسال الكود. حاول تاني.'
            : 'Could not send a code. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitOtp() {
    if (!otpValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const verify = await api.verifyOtp(phoneFull, otpDigits);
      // Follow up with /me to populate name + tier + points. If /me fails
      // we still consider the customer identified (using minimal data) —
      // a stale tier badge is better than failing the whole flow.
      let name: string | null = null;
      let tier: IdentifiedCustomer['tier'] = null;
      let points = 0;
      try {
        const me = await api.getMe(verify.token);
        name = me.user.full_name ?? null;
        tier = me.tier;
        points = me.points ?? 0;
      } catch {
        // Soft-failure — keep going.
      }
      setIdentified({
        jwt: verify.token,
        userId: verify.user.id,
        name,
        tier,
        pointsBalance: points,
      });
      setWelcomeName(name);
      setPhase('done');
      window.setTimeout(() => onClose(), 1400);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : lang === 'ar'
            ? 'الكود غلط أو منتهي'
            : 'Code is incorrect or expired',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function press(digit: string, target: 'phone' | 'otp') {
    setError(null);
    if (target === 'phone') {
      setPhoneDigits((d) => (d.length < 11 ? d + digit : d));
    } else {
      setOtpDigits((d) => (d.length < 6 ? d + digit : d));
    }
  }
  function backspace(target: 'phone' | 'otp') {
    setError(null);
    if (target === 'phone') setPhoneDigits((d) => d.slice(0, -1));
    else setOtpDigits((d) => d.slice(0, -1));
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="identify-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="identify-title"
          className="fixed inset-0 z-[60] grid place-items-center bg-[var(--cup-espresso)]/55"
          onClick={onClose}
        >
          <motion.div
            key="identify-card"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-card bg-white p-10 shadow-elevated"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'ar' ? 'أغلق' : 'Close'}
              className="absolute right-6 top-6 grid h-14 w-14 place-items-center rounded-full bg-[var(--cup-paper)] text-[var(--cup-espresso)] transition active:scale-[0.94]"
            >
              <X className="h-7 w-7" />
            </button>

            {phase === 'phone' ? (
              <PhoneStep
                lang={lang}
                phoneDigits={phoneDigits}
                onPress={(d) => press(d, 'phone')}
                onBackspace={() => backspace('phone')}
                onSubmit={submitPhone}
                submitting={submitting}
                error={error}
                phoneValid={phoneValid}
              />
            ) : phase === 'otp' ? (
              <OtpStep
                lang={lang}
                phoneFull={phoneFull}
                otpDigits={otpDigits}
                onPress={(d) => press(d, 'otp')}
                onBackspace={() => backspace('otp')}
                onSubmit={submitOtp}
                onBack={() => {
                  setOtpDigits('');
                  setError(null);
                  setPhase('phone');
                }}
                submitting={submitting}
                error={error}
                otpValid={otpValid}
              />
            ) : (
              <DoneStep lang={lang} name={welcomeName} />
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── steps ───────────────────────────────────────────────────────────────

function PhoneStep({
  lang,
  phoneDigits,
  onPress,
  onBackspace,
  onSubmit,
  submitting,
  error,
  phoneValid,
}: {
  lang: 'en' | 'ar';
  phoneDigits: string;
  onPress: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  phoneValid: boolean;
}) {
  return (
    <div>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-cup-primary text-white">
        <Phone className="h-7 w-7" />
      </span>
      <h2 id="identify-title" className="mt-5 font-heading text-k-hero text-[var(--cup-espresso)]">
        {lang === 'ar' ? 'جمّع نقاط' : 'Earn points'}
      </h2>
      <p className="mt-2 font-body text-k-body text-[var(--cup-cocoa)]">
        {lang === 'ar'
          ? 'هنبعتلك كود مرة واحدة على الموبايل'
          : "We'll send a one-time code to your phone."}
      </p>

      <PhoneDisplay digits={phoneDigits} />

      <Keypad onPress={onPress} onBackspace={onBackspace} className="mt-6" />

      {error ? <ErrorRow message={error} /> : null}

      <BigButton
        size="xl"
        onClick={onSubmit}
        disabled={!phoneValid || submitting}
        className="mt-6 w-full"
      >
        {submitting
          ? lang === 'ar' ? 'بنبعت…' : 'Sending…'
          : lang === 'ar' ? 'ابعت كود' : 'Send code'}
      </BigButton>
    </div>
  );
}

function OtpStep({
  lang,
  phoneFull,
  otpDigits,
  onPress,
  onBackspace,
  onSubmit,
  onBack,
  submitting,
  error,
  otpValid,
}: {
  lang: 'en' | 'ar';
  phoneFull: string;
  otpDigits: string;
  onPress: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
  otpValid: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--cup-cocoa)] transition hover:text-[var(--cup-espresso)]"
      >
        <ChevronLeft className="h-5 w-5" />
        {lang === 'ar' ? 'تغيير الموبايل' : 'Change phone'}
      </button>
      <h2 className="font-heading text-k-hero text-[var(--cup-espresso)]">
        {lang === 'ar' ? 'الكود' : 'Enter the code'}
      </h2>
      <p className="mt-2 font-body text-k-body text-[var(--cup-cocoa)]">
        {lang === 'ar'
          ? `بعتنالك ٦ أرقام على ${phoneFull}`
          : `We sent 6 digits to ${phoneFull}.`}
      </p>

      <OtpDisplay digits={otpDigits} />

      <Keypad onPress={onPress} onBackspace={onBackspace} className="mt-6" />

      {error ? <ErrorRow message={error} /> : null}

      <BigButton
        size="xl"
        onClick={onSubmit}
        disabled={!otpValid || submitting}
        className="mt-6 w-full"
      >
        {submitting
          ? lang === 'ar' ? 'بنتأكد…' : 'Verifying…'
          : lang === 'ar' ? 'تأكيد' : 'Verify'}
      </BigButton>
    </div>
  );
}

function DoneStep({ lang, name }: { lang: 'en' | 'ar'; name: string | null }) {
  const greeting = name
    ? lang === 'ar'
      ? `أهلاً يا ${name} 👋`
      : `Welcome back, ${name} 👋`
    : lang === 'ar'
      ? 'أهلاً بيك تاني 👋'
      : 'Welcome back 👋';
  return (
    <div className="grid place-items-center py-8 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-cup-success text-white shadow-card">
        <Check className="h-10 w-10" strokeWidth={2.5} />
      </span>
      <h2 className="mt-6 font-heading text-k-hero text-[var(--cup-espresso)]">
        {greeting}
      </h2>
      <p className="mt-3 font-body text-k-body text-[var(--cup-cocoa)]">
        {lang === 'ar'
          ? 'النقاط هتترصّد على الطلب ده'
          : "You'll earn points on this order."}
      </p>
    </div>
  );
}

// ── shared building blocks ──────────────────────────────────────────────

function PhoneDisplay({ digits }: { digits: string }) {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-[var(--cup-stroke)] bg-[var(--cup-paper)] px-5 py-4 font-heading text-[36px] font-extrabold tabular-nums text-[var(--cup-espresso)]">
      <span className="text-[var(--cup-muted)]">+20</span>
      <span className="flex-1">{digits || ' '}</span>
    </div>
  );
}

function OtpDisplay({ digits }: { digits: string }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      {Array.from({ length: 6 }).map((_, i) => {
        const filled = i < digits.length;
        return (
          <span
            key={i}
            className={[
              'grid h-16 w-16 place-items-center rounded-2xl border-2 font-heading text-[36px] font-extrabold tabular-nums',
              filled
                ? 'border-cup-primary bg-white text-[var(--cup-espresso)]'
                : 'border-[var(--cup-stroke)] bg-[var(--cup-paper)] text-[var(--cup-muted)]',
            ].join(' ')}
          >
            {filled ? digits[i] : ''}
          </span>
        );
      })}
    </div>
  );
}

function Keypad({
  onPress,
  onBackspace,
  className,
}: {
  onPress: (digit: string) => void;
  onBackspace: () => void;
  className?: string;
}) {
  const rows: (string | 'back')[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];
  return (
    <div className={['grid grid-cols-3 gap-3', className ?? ''].join(' ')}>
      {rows.flat().map((cell, i) =>
        cell === '' ? (
          <span key={`empty-${i}`} aria-hidden="true" />
        ) : cell === 'back' ? (
          <button
            key="back"
            type="button"
            onClick={onBackspace}
            aria-label="Backspace"
            className="grid h-16 place-items-center rounded-2xl bg-[var(--cup-paper)] font-heading text-[28px] font-bold text-[var(--cup-cocoa)] transition active:scale-[0.96]"
          >
            ⌫
          </button>
        ) : (
          <button
            key={cell}
            type="button"
            onClick={() => onPress(cell)}
            className="grid h-16 place-items-center rounded-2xl bg-white font-heading text-[28px] font-bold text-[var(--cup-espresso)] shadow-subtle transition active:scale-[0.96]"
          >
            {cell}
          </button>
        ),
      )}
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-4 rounded-2xl bg-[var(--cup-error)]/10 px-4 py-3 text-base font-semibold text-[var(--cup-error)]"
    >
      {message}
    </div>
  );
}
