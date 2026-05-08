'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trophy, Clock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { GameSession } from '@/lib/types';

// ─── Canvas colours (Cup & Co palette) ──────────────────────────────────────
const C = {
  bg: '#FAF6F0',         // cup-paper
  bean: '#C2410C',       // terracotta primary
  beanShadow: '#9A3412', // darker terracotta
  cup: '#1C1917',        // deep espresso
  cupRim: '#44403C',
  text: '#1C1917',
  nice: '#C2410C',
  heartFull: '#C2410C',
  heartEmpty: '#E7E5E4',
} as const;

const GAME_DURATION = 60; // seconds
const INITIAL_SPAWN_MS = 1200;
const SPAWN_DECREMENT = 15;
const MIN_SPAWN_MS = 500;
const INITIAL_SPEED = 1.0;
const SPEED_INCREMENT = 0.015;
const POINTS_PER_BEAN = 10;
const MAX_LIVES = 3;
const CUP_WIDTH = 72;
const CUP_HEIGHT = 44;
const BEAN_RX = 14;
const BEAN_RY = 9;

interface Bean {
  id: number;
  x: number;
  y: number;
  speed: number;
}

interface FloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
}

interface GameState {
  beans: Bean[];
  floatTexts: FloatText[];
  score: number;
  lives: number;
  cupX: number;
  spawnInterval: number;
  speedMultiplier: number;
  beanCounter: number;
  floatCounter: number;
  lastSpawnTime: number;
  startTime: number;
  elapsed: number;
}

type ScreenState = 'idle' | 'playing' | 'gameover';

interface Props {
  session: GameSession;
  sessionsUsed: number;
  onBack: () => void;
}

export function CoffeeCollectorGame({ session, sessionsUsed, onBack }: Props) {
  const { t, language } = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const screenRef = useRef<ScreenState>('idle');
  const [screen, setScreen] = useState<ScreenState>('idle');
  const [liveScore, setLiveScore] = useState(0);
  const [liveLives, setLiveLives] = useState(MAX_LIVES);
  const [liveTime, setLiveTime] = useState(GAME_DURATION);
  const [finalScore, setFinalScore] = useState(0);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dailyLeft = 3 - sessionsUsed;

  // ─── Draw helpers ──────────────────────────────────────────────────────────
  function drawBean(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    // Shadow
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 2, BEAN_RX, BEAN_RY, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(28,25,23,0.18)';
    ctx.fill();
    // Body
    ctx.beginPath();
    ctx.ellipse(x, y, BEAN_RX, BEAN_RY, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.bean;
    ctx.fill();
    // Crack (S-curve)
    ctx.beginPath();
    ctx.moveTo(x, y - BEAN_RY + 3);
    ctx.bezierCurveTo(x + 5, y - 2, x - 5, y + 2, x, y + BEAN_RY - 3);
    ctx.strokeStyle = C.beanShadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawCup(ctx: CanvasRenderingContext2D, x: number, canvasH: number) {
    const cy = canvasH - CUP_HEIGHT / 2 - 8;
    ctx.save();
    // Cup body (trapezoid)
    ctx.beginPath();
    ctx.moveTo(x - CUP_WIDTH / 2 + 6, cy - CUP_HEIGHT / 2);
    ctx.lineTo(x + CUP_WIDTH / 2 - 6, cy - CUP_HEIGHT / 2);
    ctx.lineTo(x + CUP_WIDTH / 2, cy + CUP_HEIGHT / 2);
    ctx.lineTo(x - CUP_WIDTH / 2, cy + CUP_HEIGHT / 2);
    ctx.closePath();
    ctx.fillStyle = C.cup;
    ctx.fill();
    // Rim
    ctx.beginPath();
    ctx.ellipse(x, cy - CUP_HEIGHT / 2, CUP_WIDTH / 2 - 4, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.cupRim;
    ctx.fill();
    // Handle
    ctx.beginPath();
    ctx.arc(x + CUP_WIDTH / 2 + 2, cy, 10, -Math.PI / 2, Math.PI / 2, false);
    ctx.strokeStyle = C.cupRim;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  function drawHUD(
    ctx: CanvasRenderingContext2D,
    score: number,
    lives: number,
    elapsed: number,
    w: number,
  ) {
    const remaining = Math.max(0, GAME_DURATION - Math.floor(elapsed));
    // Score
    ctx.save();
    ctx.font = 'bold 18px "Sora", system-ui, sans-serif';
    ctx.fillStyle = C.text;
    ctx.textAlign = 'left';
    ctx.fillText(`${score} pts`, 16, 32);
    // Timer
    ctx.textAlign = 'center';
    ctx.fillStyle = remaining <= 10 ? '#B91C1C' : C.text;
    ctx.fillText(`${remaining}s`, w / 2, 32);
    // Hearts
    const heartSize = 16;
    const heartGap = 22;
    const startX = w - 16 - heartSize * MAX_LIVES - heartGap * (MAX_LIVES - 1);
    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.fillStyle = i < lives ? C.heartFull : C.heartEmpty;
      // simple heart shape via path
      const hx = startX + i * (heartSize + heartGap - heartSize) + heartSize / 2;
      const hy = 20;
      ctx.beginPath();
      ctx.moveTo(hx, hy + heartSize * 0.25);
      ctx.bezierCurveTo(hx, hy, hx - heartSize / 2, hy, hx - heartSize / 2, hy + heartSize * 0.25);
      ctx.bezierCurveTo(hx - heartSize / 2, hy + heartSize * 0.5, hx, hy + heartSize * 0.75, hx, hy + heartSize);
      ctx.bezierCurveTo(hx, hy + heartSize * 0.75, hx + heartSize / 2, hy + heartSize * 0.5, hx + heartSize / 2, hy + heartSize * 0.25);
      ctx.bezierCurveTo(hx + heartSize / 2, hy, hx, hy, hx, hy + heartSize * 0.25);
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── Game loop ─────────────────────────────────────────────────────────────
  const endGame = useCallback(
    async (gs: GameState) => {
      cancelAnimationFrame(rafRef.current);
      const score = Math.min(gs.score, session.serverMaxScore);
      const elapsed = gs.elapsed;
      setFinalScore(score);
      setScreen('gameover');
      screenRef.current = 'gameover';
      setSubmitting(true);
      try {
        const res = await api.submitGameScore(session.id, score, Math.round(elapsed));
        setPointsAwarded(res.pointsAwarded);
      } catch (e) {
        setSubmitError(e instanceof ApiError ? e.message : 'Score submission failed');
      } finally {
        setSubmitting(false);
      }
    },
    [session.id, session.serverMaxScore],
  );

  const tick = useCallback(
    (now: number) => {
      const gs = stateRef.current;
      const canvas = canvasRef.current;
      if (!gs || !canvas || screenRef.current !== 'playing') return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      gs.elapsed = (now - gs.startTime) / 1000;

      // ─── Check time limit
      if (gs.elapsed >= GAME_DURATION) {
        void endGame(gs);
        return;
      }

      // ─── Spawn new bean
      if (now - gs.lastSpawnTime >= gs.spawnInterval) {
        gs.lastSpawnTime = now;
        const margin = BEAN_RX + 10;
        gs.beans.push({
          id: gs.beanCounter++,
          x: margin + Math.random() * (w - margin * 2),
          y: -BEAN_RY,
          speed: (2 + Math.random() * 1.5) * gs.speedMultiplier,
        });
        // Ramp difficulty
        gs.spawnInterval = Math.max(MIN_SPAWN_MS, gs.spawnInterval - SPAWN_DECREMENT);
        gs.speedMultiplier += SPEED_INCREMENT;
      }

      // ─── Move beans, detect catch / miss
      const cupTop = h - CUP_HEIGHT - 8;
      const newBeans: Bean[] = [];
      for (const bean of gs.beans) {
        bean.y += bean.speed;
        if (bean.y + BEAN_RY >= cupTop && bean.y - BEAN_RY <= h - 8) {
          // Collision check with cup opening (rim area)
          if (Math.abs(bean.x - gs.cupX) < CUP_WIDTH / 2) {
            // Caught!
            gs.score += POINTS_PER_BEAN;
            gs.floatTexts.push({
              id: gs.floatCounter++,
              x: bean.x,
              y: cupTop - 10,
              text: '+10',
              alpha: 1,
              vy: -1.5,
            });
            continue; // remove bean
          }
        }
        if (bean.y - BEAN_RY > h) {
          // Missed
          gs.lives = Math.max(0, gs.lives - 1);
          gs.floatTexts.push({
            id: gs.floatCounter++,
            x: bean.x,
            y: h - 80,
            text: '✕',
            alpha: 1,
            vy: -1,
          });
          if (gs.lives <= 0) {
            void endGame(gs);
            return;
          }
          continue; // remove bean
        }
        newBeans.push(bean);
      }
      gs.beans = newBeans;

      // ─── Update float texts
      gs.floatTexts = gs.floatTexts
        .map((ft) => ({ ...ft, y: ft.y + ft.vy, alpha: ft.alpha - 0.022 }))
        .filter((ft) => ft.alpha > 0);

      // ─── React state sync (throttled — every ~6 frames)
      if (gs.beanCounter % 6 === 0) {
        setLiveScore(gs.score);
        setLiveLives(gs.lives);
        setLiveTime(Math.max(0, GAME_DURATION - Math.floor(gs.elapsed)));
      }

      // ─── Draw
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, w, h);

      for (const bean of gs.beans) drawBean(ctx, bean.x, bean.y);
      drawCup(ctx, gs.cupX, h);
      drawHUD(ctx, gs.score, gs.lives, gs.elapsed, w);

      // Float texts
      for (const ft of gs.floatTexts) {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 16px "Sora", system-ui, sans-serif';
        ctx.fillStyle = ft.text === '✕' ? '#B91C1C' : C.nice;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [endGame],
  );

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const now = performance.now();
    stateRef.current = {
      beans: [],
      floatTexts: [],
      score: 0,
      lives: MAX_LIVES,
      cupX: w / 2,
      spawnInterval: INITIAL_SPAWN_MS,
      speedMultiplier: INITIAL_SPEED,
      beanCounter: 0,
      floatCounter: 0,
      lastSpawnTime: now - INITIAL_SPAWN_MS, // spawn immediately
      startTime: now,
      elapsed: 0,
    };
    setLiveScore(0);
    setLiveLives(MAX_LIVES);
    setLiveTime(GAME_DURATION);
    setFinalScore(0);
    setPointsAwarded(null);
    setSubmitError(null);
    screenRef.current = 'playing';
    setScreen('playing');
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // ─── Mouse / touch move ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleMouseMove(e: MouseEvent) {
      if (!stateRef.current || screenRef.current !== 'playing') return;
      const rect = canvas!.getBoundingClientRect();
      const scaleX = canvas!.width / rect.width;
      stateRef.current.cupX = (e.clientX - rect.left) * scaleX;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!stateRef.current || screenRef.current !== 'playing') return;
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const scaleX = canvas!.width / rect.width;
      stateRef.current.cupX = (e.touches[0].clientX - rect.left) * scaleX;
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // ─── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    observer.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => observer.disconnect();
  }, []);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      {/* Idle screen */}
      <AnimatePresence>
        {screen === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-cup-paper px-6 text-center"
          >
            <span className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-cup-orange-600/10">
              <Logo size={48} />
            </span>
            <h1 className="font-heading text-2xl font-bold text-cup-brown-900">
              {language === 'ar' ? 'جامع القهوة' : 'Coffee Collector'}
            </h1>
            <p className="mt-2 text-sm text-cup-muted">
              {language === 'ar' ? 'اصطاد حبات القهوة المتساقطة بفنجانك!' : 'Catch falling coffee beans with your cup!'}
            </p>

            <div className="mt-6 w-full rounded-2xl border border-cup-stroke bg-white p-4 text-left shadow-subtle">
              <p className="mb-2 font-heading text-xs font-semibold uppercase tracking-widest text-cup-muted">
                {t('games.instructions')}
              </p>
              <ul className="space-y-1.5 text-sm text-cup-brown-900">
                <li>• {language === 'ar' ? 'حرك الماوس / إصبعك لتوجيه الفنجان' : 'Move your mouse / finger to guide the cup'}</li>
                <li>• {t('games.catchBeans')}</li>
                <li>• {t('games.missBean')}</li>
                <li>• {t('games.timeAndLives')}</li>
              </ul>
            </div>

            <div className="mt-4 rounded-xl bg-cup-orange-600/10 px-4 py-2 text-sm font-semibold text-cup-orange-600">
              {language === 'ar' ? 'المحاولات المتبقية: ' : 'Daily sessions left: '}{Math.max(0, dailyLeft)}
            </div>

            <button
              type="button"
              onClick={startGame}
              disabled={dailyLeft <= 0}
              className="mt-6 w-full rounded-2xl bg-cup-orange-600 py-4 font-heading text-base font-bold text-white shadow-elevated transition active:scale-[0.97] disabled:opacity-40"
            >
              {dailyLeft <= 0 ? (language === 'ar' ? 'لا توجد محاولات متبقية' : 'No sessions left today') : t('games.play')}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="mt-3 text-sm text-cup-muted underline-offset-2 hover:underline"
            >
              {language === 'ar' ? 'العودة للمكافآت' : 'Back to Rewards'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over screen */}
      <AnimatePresence>
        {screen === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-cup-paper/95 px-6 text-center backdrop-blur-sm"
          >
            <span className="mb-3 grid h-20 w-20 place-items-center rounded-3xl bg-cup-orange-600/10">
              <Trophy className="h-10 w-10 text-cup-orange-600" />
            </span>
            <h2 className="font-heading text-2xl font-bold text-cup-brown-900">{t('games.gameOver')}</h2>

            <div className="mt-4 w-full rounded-2xl border border-cup-stroke bg-white p-5 shadow-subtle">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-cup-muted">
                {language === 'ar' ? 'النتيجة النهائية' : 'Final Score'}
              </p>
              <p className="mt-1 font-heading text-5xl font-bold text-cup-brown-900">
                {finalScore}
              </p>

              <div className="mt-4 border-t border-cup-stroke pt-4">
                {submitting && (
                  <div className="flex items-center justify-center gap-2 text-sm text-cup-muted">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-cup-orange-600 border-t-transparent" />
                    {language === 'ar' ? 'جاري حفظ النتيجة…' : 'Saving score…'}
                  </div>
                )}
                {!submitting && pointsAwarded !== null && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-heading text-lg font-semibold text-cup-teal-700"
                  >
                    +{pointsAwarded} {language === 'ar' ? 'نقاط ولاء مكتسبة!' : 'loyalty points earned!'}
                  </motion.p>
                )}
                {!submitting && submitError && (
                  <p className="text-sm text-cup-error">{submitError}</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex w-full gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 rounded-2xl border border-cup-stroke bg-white py-3.5 font-heading text-sm font-semibold text-cup-brown-900 shadow-subtle transition active:scale-[0.97]"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={startGame}
                disabled={dailyLeft <= 0 || submitting}
                className="flex-1 rounded-2xl bg-cup-orange-600 py-3.5 font-heading text-sm font-bold text-white shadow-elevated transition active:scale-[0.97] disabled:opacity-40"
              >
                {language === 'ar' ? 'العب مجدداً' : 'Play Again'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD overlay (playing state) */}
      {screen === 'playing' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
          <span className="rounded-xl bg-white/80 px-3 py-1.5 font-heading text-sm font-bold text-cup-brown-900 shadow-subtle backdrop-blur-sm">
            {liveScore} {language === 'ar' ? 'نقطة' : 'pts'}
          </span>
          <span
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 font-heading text-sm font-bold shadow-subtle backdrop-blur-sm ${
              liveTime <= 10
                ? 'bg-cup-error/10 text-cup-error'
                : 'bg-white/80 text-cup-brown-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {liveTime}{language === 'ar' ? 'ث' : 's'}
          </span>
          <span className="flex items-center gap-0.5 rounded-xl bg-white/80 px-3 py-1.5 shadow-subtle backdrop-blur-sm">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className={`h-4 w-4 ${i < liveLives ? 'fill-cup-orange-600 text-cup-orange-600' : 'text-cup-stroke'}`}
              />
            ))}
          </span>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        style={{ display: screen === 'playing' ? 'block' : 'none' }}
      />
    </div>
  );
}
