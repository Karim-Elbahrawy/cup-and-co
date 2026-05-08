'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Logo } from './Logo';
import { CampusSwitcher } from './CampusSwitcher';
import type { AdminSession } from '@/lib/session';

interface AdminShellProps {
  session: AdminSession;
  children: React.ReactNode;
}

/**
 * Responsive admin shell. Three breakpoints:
 *
 *  - **mobile** (`< md`)   — hidden sidebar, hamburger button in top bar opens
 *                            a slide-over drawer.
 *  - **tablet** (`md`)     — collapsed sidebar (icon-only), 64px wide.
 *  - **desktop** (`lg+`)   — full sidebar (240px wide) with labels + hints.
 *
 * The `<Sidebar>` component already handles the collapsed/full visual states
 * via Tailwind responsive classes; this shell just adds the mobile drawer
 * and the top bar with hamburger.
 */
export function AdminShell({ session, children }: AdminShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [drawerOpen]);

  // ESC closes drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-cup-paper md:flex-row">
      {/* Mobile top bar — hidden on md+ */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-cup-stroke bg-cup-surface/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-controls="admin-mobile-drawer"
          className="grid h-10 w-10 place-items-center rounded-chip border border-cup-stroke bg-white text-cup-brown-700 shadow-subtle transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Logo />
        {/* Phase 2.3: campus switcher — replaces the legacy spacer */}
        <CampusSwitcher variant="drawer" />
      </header>

      {/* Desktop sidebar (and tablet rail). Hidden on mobile. */}
      <div className="hidden md:flex">
        <Sidebar session={session} />
      </div>

      {/* Mobile drawer — only mounted while open so the heavy sidebar tree
          stays out of the tree on mobile renders */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          />

          {/* Slide-over panel */}
          <div
            id="admin-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Primary navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-cup-surface shadow-2xl md:hidden animate-[slideIn_0.18s_ease-out]"
          >
            <div className="flex h-14 items-center justify-between border-b border-cup-stroke px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="grid h-10 w-10 place-items-center rounded-chip border border-cup-stroke bg-white text-cup-brown-700 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar session={session} variant="drawer" />
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        {/* Desktop-only top bar with the campus switcher (md+). On mobile the
            switcher already lives in the sticky mobile header above. */}
        <div className="hidden border-b border-cup-stroke bg-cup-surface/60 px-4 py-2 backdrop-blur md:flex md:items-center md:justify-end md:px-8">
          <CampusSwitcher variant="rail" />
        </div>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
