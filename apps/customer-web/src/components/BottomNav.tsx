'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Home, ShoppingBag, Sparkles, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
}

const ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.home', icon: Home, exact: true },
  { href: '/orders', labelKey: 'nav.orders', icon: ClipboardList },
  { href: '/cart', labelKey: 'nav.cart', icon: ShoppingBag },
  { href: '/rewards', labelKey: 'nav.rewards', icon: Sparkles },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const { t } = useT();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--cup-stroke)] bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(28,25,23,0.06)]"
    >
      <ul className="mx-auto flex max-w-7xl items-stretch justify-around px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)] md:justify-center md:gap-16">
        {ITEMS.map(({ href, labelKey, icon: Icon, exact }) => {
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
                  {t(labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
