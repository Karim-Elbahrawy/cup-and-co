'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

/**
 * K1.1 — Attract loop.
 *
 * Fullscreen "TAP TO ORDER" splash with 4 rotating hero product images that
 * crossfade every 5s. The whole surface is one big touch target — any tap
 * (or pointerdown / keydown) calls `onActivate`.
 *
 * Behavioural notes:
 *   - We use a single `pointerdown` listener at the surface level rather
 *     than per-image so swipes during a crossfade still register. The
 *     events bubble up cleanly because the images are non-interactive.
 *   - Steam is a CSS-only sequence of three blurred ellipses with staggered
 *     `animation-delay`, intentionally below 60fps when the user has
 *     `prefers-reduced-motion` set — Framer Motion + the reduced-motion
 *     CSS rule in globals.css handle that fallback.
 *   - Hero images live at `/images/posters/0X-*.png` (copied from the
 *     existing customer-web product imagery — no new art required for K0/K1).
 */

const POSTERS = [
  { src: '/images/posters/01-macchiato.png', alt: 'Caramel macchiato' },
  { src: '/images/posters/02-cold-coffee.png', alt: 'Iced cold coffee' },
  { src: '/images/posters/03-breakfast.png', alt: 'Warm breakfast' },
  { src: '/images/posters/04-dessert.png', alt: 'Fresh dessert' },
] as const;

const ROTATE_MS = 5000;

interface AttractScreenProps {
  /** Called when the user taps anywhere on the screen. */
  onActivate: () => void;
  /** Optional copy override — useful for AR. Defaults to EN. */
  tapToOrderText?: string;
  subtitleText?: string;
}

export function AttractScreen({
  onActivate,
  tapToOrderText = 'TAP TO ORDER',
  subtitleText = 'Your morning, handled.',
}: AttractScreenProps) {
  const [index, setIndex] = useState(0);

  // Rotate the hero image every ROTATE_MS. The interval is reset whenever
  // index changes so a single timer drives the carousel — simpler than
  // per-image setTimeouts and resilient to React strict-mode double-mount.
  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % POSTERS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const poster = POSTERS[index];

  return (
    <button
      type="button"
      onClick={onActivate}
      // Make the entire surface keyboard-activatable too — handy when
      // baristas plug a Bluetooth keyboard for diagnostics.
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
      aria-label={tapToOrderText}
      className="relative grid h-dvh w-dvw place-items-center overflow-hidden text-white cup-sunrise focus:outline-none"
    >
      {/* ── Steam (decorative) ────────────────────────────────────────── */}
      <SteamPlume />

      {/* ── Rotating hero image ───────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={poster.src}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 0.85, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 1.0, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-end pr-[8vw]"
          >
            <div className="relative h-[78vmin] w-[78vmin] max-w-[820px]">
              <Image
                src={poster.src}
                alt=""
                fill
                priority={index === 0}
                sizes="78vmin"
                className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.35)]"
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Cream halo behind copy for legibility ─────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-[58vw]"
        style={{
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(254,243,199,0.28) 0%, transparent 60%)',
        }}
      />

      {/* ── Copy ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex w-full max-w-[1200px] flex-col items-start px-[6vw] text-left">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.4em] text-white/85">
          Cup &amp; Co
        </p>
        <h1 className="font-heading text-k-display leading-[0.95] drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
          {tapToOrderText}
        </h1>
        <p className="mt-6 max-w-xl font-body text-k-hero font-medium text-white/90">
          {subtitleText}
        </p>

        {/* Pulse hint chip — subtle, drifts down to invite the tap. */}
        <motion.div
          initial={{ y: 0, opacity: 0.85 }}
          animate={{ y: [0, 8, 0], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-12 inline-flex items-center gap-3 rounded-pill bg-white/15 px-6 py-4 text-k-card backdrop-blur-md"
        >
          <span aria-hidden="true">👆</span>
          <span className="font-semibold">Tap anywhere</span>
        </motion.div>
      </div>

      {/* ── Position dots (poster index) ──────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute bottom-12 right-12 flex gap-3"
      >
        {POSTERS.map((p, i) => (
          <span
            key={p.src}
            className={`block h-2.5 rounded-full transition-all duration-500 ${
              i === index ? 'w-10 bg-white' : 'w-2.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </button>
  );
}

/**
 * Decorative steam — three blurred ellipses ascending the screen on
 * staggered loops. Kept entirely in CSS so the GPU does the work and we
 * don't burn React renders on a background animation that runs forever.
 */
function SteamPlume() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-[14vw] top-1/2 h-[44vmin] w-[24vmin] -translate-y-1/2"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute left-1/2 block h-24 w-24 -translate-x-1/2 rounded-full bg-white/15 blur-2xl"
          style={{
            bottom: 0,
            animation: 'kiosk-steam 7s ease-in-out infinite',
            animationDelay: `${i * 1.6}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes kiosk-steam {
          0%   { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          25%  { opacity: 0.8; }
          100% { transform: translate(calc(-50% + 24px), -260%) scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
