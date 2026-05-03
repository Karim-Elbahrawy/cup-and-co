'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/lib/types';

interface RoleChipProps {
  role: Extract<UserRole, 'student' | 'faculty' | 'office'>;
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Pill-shaped role tab. Selected state fills with terracotta and lightly
 * springs in via Framer Motion (respects `prefers-reduced-motion`).
 */
export function RoleChip({ label, icon: Icon, selected, onSelect }: RoleChipProps) {
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
        'relative inline-flex items-center gap-2 rounded-pill px-4 py-2.5 text-sm font-semibold transition-colors',
        selected
          ? 'bg-[var(--cup-primary)] text-white shadow-[0_8px_20px_rgba(194,65,12,0.28)]'
          : 'bg-white text-[var(--cup-cocoa)] border border-[var(--cup-stroke)] hover:border-[var(--cup-primary-tint)]',
      ].join(' ')}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </motion.button>
  );
}
