'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Three-dot bouncing loader, used in buttons and inline empty states.
 * Honors `prefers-reduced-motion` by collapsing to a static row.
 */
export function LoadingDots({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={
            reduce ? undefined : { duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }
          }
        />
      ))}
    </span>
  );
}
