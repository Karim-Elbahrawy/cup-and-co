'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingBag, Sparkles, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the route exactly (`/`) or as a prefix (anything else). */
  exact?: boolean;
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/cart', label: 'Cart', icon: ShoppingBag },
  { href: '/rewards', label: 'Rewards', icon: Sparkles },
  { href: '/profile', label: 'Profile', icon: User },
];

/**
 * Sticky bottom navigation. Five icon-only tabs with text labels for screen
 * readers + visual emphasis on the active tab. Phase 1 only fully implements
 * Home + Profile — the other tabs route to placeholder pages that 404
 * gracefully (Phase 2 fills them in).
 */
export function BottomNav() {
  const pathname = usePathname() ?? '/';

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--cup-stroke)] bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(28,25,23,0.06)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="group flex flex-col items-center gap-1 py-1.5 outline-none"
              >
                <span
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-2xl transition-all',
                    active
                      ? 'bg-[var(--cup-primary)] text-white shadow-[0_6px_16px_rgba(194,65,12,0.3)]'
                      : 'text-[var(--cup-muted)] group-hover:text-[var(--cup-cocoa)] group-focus-visible:bg-[var(--cup-paper)]',
                  ].join(' ')}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span
                  className={[
                    'text-[10px] font-medium transition-colors',
                    active ? 'text-[var(--cup-primary)]' : 'text-[var(--cup-muted)]',
                  ].join(' ')}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
