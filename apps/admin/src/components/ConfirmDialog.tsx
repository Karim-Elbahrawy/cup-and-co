'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm button uses the destructive (red) style. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation primitive. Used for destructive actions across admin —
 * delete product, hide review, block user, expire offer, etc.
 *
 * - Focus trap: confirm button focuses on open
 * - ESC closes (cancel)
 * - Backdrop click cancels
 * - Returns control via callbacks; parent owns the boolean state
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    setTimeout(() => confirmRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel, busy]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => !busy && onCancel()}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card border border-cup-stroke bg-cup-surface p-6 shadow-2xl">
        {destructive && (
          <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-cup-error">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
        )}
        <h2
          id="confirm-title"
          className="font-heading text-lg font-bold text-cup-brown-900"
        >
          {title}
        </h2>
        {message && <p className="mt-1 text-sm text-cup-muted">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-pill border border-cup-stroke bg-white px-4 py-2 text-sm font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-pill px-5 py-2 text-sm font-semibold text-white shadow-subtle transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 ${
              destructive
                ? 'bg-cup-error hover:bg-rose-700 focus-visible:ring-cup-error'
                : 'bg-cup-orange-600 hover:bg-cup-orange-700 focus-visible:ring-cup-orange-600'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
