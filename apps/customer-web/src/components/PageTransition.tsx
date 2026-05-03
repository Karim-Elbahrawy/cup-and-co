'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Wraps a route's content with a gentle fade + small upward translate. Used
 * by route segments to feel cohesive between transitions. Respects
 * `prefers-reduced-motion`.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
