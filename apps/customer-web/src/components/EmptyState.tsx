'use client';

import { motion } from 'framer-motion';
import { Coffee, ShoppingBag, ClipboardList, Trophy, Frown } from 'lucide-react';

const ICONS = {
  cart: ShoppingBag,
  orders: ClipboardList,
  game: Trophy,
  coffee: Coffee,
  generic: Frown,
};

interface EmptyStateProps {
  icon: keyof typeof ICONS;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const Icon = ICONS[icon];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-cup-brown-100">
        <Icon className="h-10 w-10 text-cup-muted" />
      </span>
      <h3 className="font-heading text-lg font-bold text-cup-brown-900">
        {title}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-cup-muted">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-6 rounded-2xl bg-cup-orange-500 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-elevated transition active:scale-[0.97]"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
