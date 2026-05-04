'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gamepad2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';
import type { GameSession } from '@/lib/types';
import { CoffeeCollectorGame } from './CoffeeCollectorGame';

export default function GamePage() {
  const router = useRouter();
  const { t, language } = useT();
  const user = useSession((s) => s.user);

  const [session, setSession] = useState<GameSession | null>(null);
  const [sessionsUsed, setSessionsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isStudent = user?.role === 'student';

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.createGameSession();
      setSession(s);
      setSessionsUsed((prev) => prev + 1);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Failed to start game session');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isStudent) {
      setLoading(false);
      return;
    }
    void fetchSession();
  }, [isStudent, fetchSession]);

  function handleBack() {
    router.push('/rewards');
  }

  // Non-student gate
  if (!isStudent && !loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cup-paper px-6 pb-24 text-center">
        <span className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-cup-brown-100">
          <Gamepad2 className="h-10 w-10 text-cup-muted" />
        </span>
        <h1 className="font-heading text-xl font-bold text-cup-brown-900">
          {language === 'ar' ? 'للطلاب فقط' : 'Students Only'}
        </h1>
        <p className="mt-2 max-w-xs text-sm text-cup-muted">
          {language === 'ar'
            ? 'لعبة Coffee Collector متاحة حصرياً للطلاب. غيّر دورك إلى طالب من الصفحة الرئيسية للعب.'
            : 'The Coffee Collector game is available exclusively to students. Switch your role to Student from the home page to play.'}
        </p>
        <Link
          href="/rewards"
          className="mt-6 rounded-2xl bg-cup-orange-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-elevated transition active:scale-[0.97]"
        >
          {language === 'ar' ? 'العودة للمكافآت' : 'Back to Rewards'}
        </Link>
      </main>
    );
  }

  // Loading
  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cup-paper pb-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cup-orange-600 border-t-transparent" />
        <p className="mt-4 text-sm text-cup-muted">{t('games.preparing')}</p>
      </main>
    );
  }

  // Error (session creation failed)
  if (error || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cup-paper px-6 pb-24 text-center">
        <p className="font-heading text-base font-semibold text-cup-error">
          {error ?? t('common.error')}
        </p>
        <p className="mt-1 text-sm text-cup-muted">
          {error?.toLowerCase().includes('limit') || error?.toLowerCase().includes('session')
            ? (language === 'ar' ? 'لقد استخدمت جميع محاولاتك اليومية. عد غداً!' : 'You have used all your daily game sessions. Come back tomorrow!')
            : t('common.retry')}
        </p>
        <Link
          href="/rewards"
          className="mt-6 rounded-2xl border border-cup-stroke bg-white px-8 py-3.5 font-heading text-sm font-semibold text-cup-brown-900 shadow-subtle transition active:scale-[0.97]"
        >
          {language === 'ar' ? 'العودة للمكافآت' : 'Back to Rewards'}
        </Link>
      </main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex h-screen flex-col bg-cup-paper"
    >
      {/* Minimal header */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label={language === 'ar' ? 'العودة للمكافآت' : 'Back to rewards'}
          className="grid h-9 w-9 place-items-center rounded-full border border-cup-stroke bg-white/90 shadow-subtle backdrop-blur-sm"
        >
          <ChevronLeft className="h-4 w-4 text-cup-brown-900" />
        </button>
        <p className="font-heading text-sm font-semibold text-cup-brown-900">
          {language === 'ar' ? 'جامع القهوة' : 'Coffee Collector'}
        </p>
        <span className="w-9" aria-hidden="true" />
      </header>

      {/* Game fills the rest */}
      <div className="flex-1 pt-14">
        <CoffeeCollectorGame
          session={session}
          sessionsUsed={sessionsUsed}
          onBack={handleBack}
        />
      </div>
    </motion.main>
  );
}
