'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface CategoryChipProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

export function CategoryChip({ label, selected, onSelect }: CategoryChipProps) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      role="tab"
      aria-selected={selected}
      whileTap={reduce ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={[
        'relative inline-flex items-center justify-center whitespace-nowrap rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors',
        selected
          ? 'bg-[var(--cup-primary)] text-white shadow-[0_8px_20px_rgba(194,65,12,0.28)]'
          : 'bg-white text-[var(--cup-cocoa)] border border-[var(--cup-stroke)] hover:border-[var(--cup-primary-tint)]',
      ].join(' ')}
    >
      <span>{label}</span>
    </motion.button>
  );
}
