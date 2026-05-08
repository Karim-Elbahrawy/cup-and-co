'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart, cartItemCount, cartTotalEgp } from '@/lib/cart';

/**
 * Sticky bottom-right cart pill — visible whenever the cart has at least
 * one item. Shows count + total in EGP, taps expand the cart drawer (K1.5).
 *
 * Hides itself entirely when the cart is empty so the catalog grid is
 * unobstructed during browsing — that's the K1.2 behaviour. K1.5 keeps the
 * same component but wires `onClick` to open the drawer.
 */
interface CartPillProps {
  onClick?: () => void;
}

export function CartPill({ onClick }: CartPillProps) {
  const lines = useCart((s) => s.lines);
  const count = cartItemCount(lines);
  const total = cartTotalEgp(lines);

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-8 right-8 z-50 flex items-center gap-4 rounded-pill bg-cup-primary px-7 py-4 font-heading text-k-card font-bold text-white shadow-elevated transition-transform active:scale-[0.98]"
      aria-label={`Open cart with ${count} item${count === 1 ? '' : 's'}`}
    >
      <span
        className="grid h-10 w-10 place-items-center rounded-full bg-white/20"
        aria-hidden="true"
      >
        <ShoppingBag className="h-6 w-6" strokeWidth={2.25} />
      </span>
      <span>
        {count} {count === 1 ? 'item' : 'items'}
      </span>
      <span className="rounded-full bg-white/15 px-4 py-1.5 text-[22px]">
        {total} EGP
      </span>
    </button>
  );
}
