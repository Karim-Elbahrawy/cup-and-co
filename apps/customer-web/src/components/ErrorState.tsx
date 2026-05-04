'use client';

import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      role="alert"
    >
      <span className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-red-100">
        <AlertCircle className="h-10 w-10 text-cup-error" />
      </span>
      <h3 className="font-heading text-lg font-bold text-cup-brown-900">
        {title ?? 'Something went wrong'}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-cup-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 flex items-center gap-2 rounded-2xl border border-cup-stroke bg-white px-8 py-3.5 font-heading text-sm font-semibold text-cup-brown-900 shadow-subtle transition active:scale-[0.97]"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </motion.div>
  );
}
