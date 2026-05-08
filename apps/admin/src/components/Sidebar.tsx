'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ListOrdered,
  CupSoda,
  QrCode,
  Settings,
  LogOut,
  Star,
  Users,
  Tag,
  BarChart3,
  ChefHat,
  Tablet,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { Logo } from './Logo';
import type { AdminSession } from '@/lib/session';
import { clearSession } from '@/lib/session';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  label: string;
  href: string;
  icon: IconType;
  /** Suffix shown to the right of the label, e.g. role-scoped hints. */
  hint?: (session: AdminSession) => string | null;
}

const NAV: NavItem[] = [
  { label: 'Today', href: '/', icon: LayoutDashboard },
  { label: 'Orders', href: '/orders', icon: ListOrdered },
  { label: 'KDS', href: '/kds', icon: ChefHat },
  { label: 'Kiosks', href: '/kiosks', icon: Tablet },
  {
    label: 'Menu',
    href: '/menu',
    icon: CupSoda,
    hint: (s) => (s.role === 'barista' ? 'Read-only' : null),
  },
  { label: 'QR Receipts', href: '/qr', icon: QrCode },
  {
    label: 'Reviews',
    href: '/reviews',
    icon: Star,
    hint: (s) => (s.role === 'barista' ? 'Owner only' : null),
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    hint: (s) => (s.role === 'barista' ? 'Owner only' : null),
  },
  {
    label: 'Offers',
    href: '/offers',
    icon: Tag,
    hint: (s) => (s.role === 'barista' ? 'Owner only' : null),
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    hint: (s) => (s.role === 'barista' ? 'Owner only' : null),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    hint: (s) => (s.role === 'barista' ? 'Limited' : null),
  },
];

interface SidebarProps {
  session: AdminSession;
  /**
   * `'rail'` (default) — collapsed icon-only at the md breakpoint, full
   * labels at lg+. Used for the desktop persistent sidebar.
   *
   * `'drawer'` — always full-width with labels. Used by AdminShell's mobile
   * slide-over which renders this inside a 288px panel.
   */
  variant?: 'rail' | 'drawer';
}

export function Sidebar({ session, variant = 'rail' }: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const isDrawer = variant === 'drawer';

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  // Visibility helpers for label / hint columns. The drawer variant always
  // shows them; the rail variant follows breakpoints (icon-only at md, full
  // labels at lg+).
  const labelClass = isDrawer ? 'inline' : 'hidden lg:inline';
  const hintClass = isDrawer ? 'inline' : 'hidden lg:inline';

  return (
    <aside
      className={
        isDrawer
          ? 'flex h-full w-full shrink-0 flex-col bg-cup-surface'
          : 'sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-cup-stroke bg-cup-surface lg:w-60'
      }
      aria-label="Primary navigation"
    >
      {!isDrawer && (
        <div className="flex h-16 items-center border-b border-cup-stroke px-3 lg:px-5">
          <span className="hidden lg:flex">
            <Logo />
          </span>
          <span className="mx-auto lg:hidden">
            <Logo iconOnly />
          </span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-4 md:px-3">
        <ul className="space-y-1">
          {NAV.filter((item) => {
            // Hide owner-only nav items from baristas
            const ownerOnly = ['/reviews', '/users', '/offers', '/reports'];
            if (ownerOnly.includes(item.href) && session.role !== 'owner') return false;
            return true;
          }).map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            const hint = item.hint?.(session) ?? null;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-3 rounded-chip px-2.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 lg:px-3 ${
                    isActive
                      ? 'bg-cup-orange-100 text-cup-orange-700'
                      : 'text-cup-brown-700 hover:bg-cup-cream-100'
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-pill bg-cup-orange-600"
                      aria-hidden
                    />
                  )}
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className={`flex-1 truncate ${labelClass}`}>{item.label}</span>
                  {hint && (
                    <span
                      className={`rounded-pill bg-cup-brown-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cup-muted ${hintClass}`}
                    >
                      {hint}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-cup-stroke px-2 py-3 lg:px-3">
        <div className={isDrawer ? 'block' : 'hidden lg:block'}>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
            Signed in
          </p>
          <p className="truncate px-2 text-sm font-semibold text-cup-brown-900">{session.email}</p>
          <p className="px-2 text-xs capitalize text-cup-teal-700">{session.role}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-pill border border-cup-stroke bg-white px-3 py-2 text-sm font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className={labelClass}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
