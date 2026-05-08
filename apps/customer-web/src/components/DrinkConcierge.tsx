'use client';

/**
 * Cup AI Drink Concierge.
 *
 * A floating sparkle button on the home page opens this panel. The user
 * describes what they're craving (typing or via voice) in English or Arabic,
 * and the server returns a deterministic match — no LLM, no API costs.
 *
 * Voice input uses the browser-native Web Speech API; it's free, supports
 * `ar-EG`, and gracefully degrades when unavailable (we hide the mic button).
 *
 * Three view states:
 *  - idle   → suggestion chips + text + mic
 *  - asking → typing/listening; chips animate
 *  - showing → 1-3 result cards with reason badges
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, MicOff, Send, X, Loader2, Plus } from 'lucide-react';
import { api, ApiError, type ConciergeMatch, type ConciergeSuggestResponse } from '@/lib/api';
import { useT, formatPrice } from '@/lib/i18n';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/types';

// ── Suggestion prompts shown when the panel is idle ────────────────────────
const PROMPTS_EN = [
  'Something energising and cold',
  'Sweet but no caffeine',
  'My usual morning coffee',
  'Light and refreshing',
];
const PROMPTS_AR = [
  'حاجة منشطة وباردة',
  'حلو بدون كافيين',
  'قهوتي الصباحية',
  'خفيف ومنعش',
];

// ── Web Speech API typing — declared locally; not in DOM lib by default ────
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ───────────────────────────────────────────────────────────────────────────

export function DrinkConcierge() {
  const { t, language } = useT();
  const isArabic = language === 'ar';
  const [open, setOpen] = useState(false);

  // Floating-action button (FAB) lives on the home page; the panel mounts
  // only when open so we don't pay a render cost while idle.
  return (
    <>
      <FabButton onOpen={() => setOpen(true)} arabic={isArabic} />
      <AnimatePresence>
        {open && (
          <ConciergePanel onClose={() => setOpen(false)} language={language} t={t} />
        )}
      </AnimatePresence>
    </>
  );
}

// ── FAB ────────────────────────────────────────────────────────────────────

function FabButton({ onOpen, arabic }: { onOpen: () => void; arabic: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={arabic ? 'مساعد المشروبات' : 'Drink Concierge'}
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="fixed bottom-24 z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cup-orange-500 to-cup-orange-700 text-white shadow-[0_8px_24px_rgba(194,65,12,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-700 focus-visible:ring-offset-2"
      style={{
        // Keep clear of the `ActiveOrderBanner` and the bottom nav.
        [arabic ? 'left' : 'right']: '1.25rem',
        // Subtle ambient pulse to draw the eye.
      }}
    >
      <Sparkles className="h-6 w-6" />
      <span
        className="absolute inset-0 -z-10 rounded-full bg-cup-orange-500/40 blur-md"
        aria-hidden="true"
      />
    </motion.button>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────

interface PanelProps {
  onClose: () => void;
  language: 'en' | 'ar';
  t: (key: string) => string;
}

type Phase = 'idle' | 'loading' | 'showing' | 'error';

function ConciergePanel({ onClose, language, t }: PanelProps) {
  const isArabic = language === 'ar';
  const prompts = isArabic ? PROMPTS_AR : PROMPTS_EN;

  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConciergeSuggestResponse | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close on Escape — established UX for modal overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus the input on mount so users can just start typing.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 2) return;
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      setPhase('loading');
      setError(null);
      try {
        const res = await api.conciergeSuggest(trimmed, language, ctl.signal);
        if (ctl.signal.aborted) return;
        if (res.matches.length === 0) {
          setError(isArabic ? 'لم أجد ما يناسب طلبك. جرّب وصفاً آخر.' : "I couldn't find a match. Try describing it differently.");
          setPhase('error');
          return;
        }
        setResult(res);
        setPhase('showing');
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
        const msg =
          err instanceof ApiError
            ? err.message
            : isArabic ? 'حدث خطأ، جرّب مرة أخرى.' : 'Something went wrong. Try again.';
        setError(msg);
        setPhase('error');
      }
    },
    [language, isArabic],
  );

  // ── Voice input ────────────────────────────────────────────────────────
  const recognitionCtor = getRecognitionCtor();
  const voiceSupported = recognitionCtor !== null;

  const startListening = useCallback(() => {
    if (!recognitionCtor) return;
    try {
      const rec = new recognitionCtor();
      rec.lang = isArabic ? 'ar-EG' : 'en-US';
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? '';
        if (transcript) {
          setQuery(transcript);
          // Auto-submit voice queries — feels more natural.
          void submit(transcript);
        }
      };
      rec.onerror = () => {
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
      };
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [recognitionCtor, isArabic, submit]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  // Cleanup on unmount.
  useEffect(() => () => {
    abortRef.current?.abort();
    recognitionRef.current?.abort();
  }, []);

  function reset() {
    setQuery('');
    setResult(null);
    setError(null);
    setPhase('idle');
    inputRef.current?.focus();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-cup-brown-900/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="concierge-title"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-cup-paper shadow-elevated sm:rounded-3xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-cup-stroke bg-white/70 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-cup-orange-500 to-cup-orange-700 text-white shadow-warm-glow">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 id="concierge-title" className="font-heading text-base font-bold text-cup-brown-900">
                {isArabic ? 'مساعد المشروبات' : 'Cup AI'}
              </h2>
              <p className="text-[11px] text-cup-muted">
                {isArabic ? 'وصف ما تريد — سأختار لك' : 'Describe what you want — I’ll find it'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel')}
            className="grid h-8 w-8 place-items-center rounded-full text-cup-muted transition hover:bg-cup-cream-100 hover:text-cup-brown-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            {phase === 'showing' && result ? (
              <ResultsView
                key="results"
                result={result}
                language={language}
                onReset={reset}
                onClose={onClose}
              />
            ) : (
              <IdleView
                key="idle"
                isArabic={isArabic}
                prompts={prompts}
                phase={phase}
                error={error}
                onPick={(p) => { setQuery(p); void submit(p); }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Composer */}
        {phase !== 'showing' && (
          <form
            onSubmit={(e) => { e.preventDefault(); void submit(query); }}
            className="flex items-center gap-2 border-t border-cup-stroke bg-white px-3 py-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {voiceSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                aria-label={listening ? (isArabic ? 'إيقاف' : 'Stop listening') : (isArabic ? 'تحدّث' : 'Speak')}
                aria-pressed={listening}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${
                  listening
                    ? 'bg-cup-orange-600 text-white shadow-warm-glow animate-pulse'
                    : 'border border-cup-stroke bg-white text-cup-brown-700 hover:bg-cup-cream-100'
                }`}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              dir={isArabic ? 'rtl' : 'ltr'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isArabic ? 'اكتب ما تريد…' : 'Type what you want…'}
              maxLength={300}
              disabled={phase === 'loading'}
              className="min-w-0 flex-1 rounded-full border border-cup-stroke bg-cup-paper px-4 py-2.5 text-sm focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={query.trim().length < 2 || phase === 'loading'}
              aria-label={isArabic ? 'إرسال' : 'Send'}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cup-orange-600 text-white shadow-warm-glow transition hover:bg-cup-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === 'loading'
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <Send className="h-5 w-5" />}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Idle / loading / error view ────────────────────────────────────────────

interface IdleViewProps {
  isArabic: boolean;
  prompts: string[];
  phase: Phase;
  error: string | null;
  onPick: (prompt: string) => void;
}

function IdleView({ isArabic, prompts, phase, error, onPick }: IdleViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="space-y-4"
    >
      <p className="text-sm text-cup-brown-700">
        {isArabic
          ? 'أخبرني عن مزاجك أو ما تشتهيه، وسأقترح ٣ مشروبات تناسبك تماماً.'
          : 'Tell me your mood or craving — I’ll suggest 3 drinks that fit.'}
      </p>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
          {isArabic ? 'جرّب' : 'Try'}
        </p>
        <div className="flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              disabled={phase === 'loading'}
              className="rounded-full border border-cup-stroke bg-white px-3.5 py-1.5 text-xs font-medium text-cup-brown-700 transition hover:border-cup-orange-300 hover:bg-cup-cream-100 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-card border border-cup-error/30 bg-rose-50 p-3 text-sm text-cup-error">
          {error}
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-cup-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{isArabic ? 'أبحث في القائمة…' : 'Searching the menu…'}</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Results view ───────────────────────────────────────────────────────────

interface ResultsViewProps {
  result: ConciergeSuggestResponse;
  language: 'en' | 'ar';
  onReset: () => void;
  onClose: () => void;
}

function ResultsView({ result, language, onReset, onClose }: ResultsViewProps) {
  const isArabic = language === 'ar';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="space-y-3"
    >
      <header className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
          {isArabic ? 'اقتراحاتي لك' : 'My picks for you'}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-cup-orange-700 hover:underline"
        >
          {isArabic ? 'حاول مجدداً' : 'Try again'}
        </button>
      </header>

      <ul className="space-y-2.5">
        {result.matches.map((m, i) => (
          <MatchCard key={m.product.id} match={m} index={i} language={language} onAdded={onClose} />
        ))}
      </ul>
    </motion.div>
  );
}

// ── Single match card ──────────────────────────────────────────────────────

function MatchCard({
  match,
  index,
  language,
  onAdded,
}: {
  match: ConciergeMatch;
  index: number;
  language: 'en' | 'ar';
  onAdded: () => void;
}) {
  const isArabic = language === 'ar';
  const product = match.product as Product;
  const name = isArabic ? product.name_ar : product.name_en;
  const description = isArabic ? product.description_ar : product.description_en;
  const addToCart = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart({
      productId: product.id,
      productNameEn: product.name_en,
      productNameAr: product.name_ar,
      unitPriceEgp: product.base_price_egp,
      quantity: 1,
      options: {},
      imageUrl: product.image_url,
    });
    setAdded(true);
    setTimeout(onAdded, 800);
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="overflow-hidden rounded-card border border-cup-stroke bg-white shadow-subtle"
    >
      <div className="flex items-stretch gap-3 p-3">
        <Link
          href={`/products/${product.id}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cup-cream-100"
        >
          {product.image_url && (
            <Image
              src={product.image_url}
              alt={name}
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/products/${product.id}`}
              className="font-heading text-sm font-bold text-cup-brown-900 hover:underline"
            >
              {name}
            </Link>
            <span className="shrink-0 font-heading text-sm font-bold text-cup-orange-700">
              {formatPrice(product.base_price_egp, language)}
            </span>
          </div>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-cup-muted">{description}</p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="rounded-full bg-cup-cream-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cup-brown-700">
              {match.reason}
            </span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={added}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                added
                  ? 'bg-cup-teal-100 text-cup-teal-700'
                  : 'bg-cup-orange-600 text-white shadow-warm-glow hover:bg-cup-orange-700'
              }`}
            >
              {added ? (isArabic ? 'تمت الإضافة' : 'Added') : <><Plus className="h-3 w-3" />{isArabic ? 'أضف' : 'Add'}</>}
            </button>
          </div>
        </div>
      </div>
    </motion.li>
  );
}
