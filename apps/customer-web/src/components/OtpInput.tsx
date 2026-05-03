'use client';

import { useEffect, useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  /** Fires when all `length` digits have been entered. */
  onComplete?: (value: string) => void;
}

/**
 * 6-digit OTP entry with single-character boxes. Auto-advances on input,
 * supports backspace navigation, and accepts pasted codes.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  disabled = false,
  hasError = false,
  onComplete,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // We only fire complete on length transitions; intentionally leaving
    // onComplete out of deps so a parent re-creating the callback doesn't loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const setDigit = (index: number, digit: string) => {
    const sanitized = digit.replace(/\D/g, '').slice(0, 1);
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = sanitized || ' ';
    const next = chars.join('').replace(/ /g, '').slice(0, length);
    onChange(next);
    if (sanitized && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKey = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        refs.current[index - 1]?.focus();
        const next = value.slice(0, index - 1);
        onChange(next);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    const focusIndex = Math.min(text.length, length - 1);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div
      className="flex items-center justify-between gap-2"
      role="group"
      aria-label="One-time passcode"
    >
      {Array.from({ length }).map((_, i) => {
        const digit = value[i] ?? '';
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${i + 1}`}
            className={[
              'h-14 w-12 rounded-2xl border-2 bg-white text-center font-heading text-2xl font-semibold',
              'transition-all duration-150 outline-none',
              'focus:border-[var(--cup-primary)] focus:shadow-[0_0_0_4px_rgba(194,65,12,0.12)]',
              hasError
                ? 'border-[var(--cup-error)] text-[var(--cup-error)]'
                : digit
                  ? 'border-[var(--cup-primary)] text-[var(--cup-espresso)]'
                  : 'border-[var(--cup-stroke)] text-[var(--cup-espresso)]',
              disabled ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}
