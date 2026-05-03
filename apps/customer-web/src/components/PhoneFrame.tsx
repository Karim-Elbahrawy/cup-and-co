/**
 * On wider viewports the customer-web app is centered inside a phone-shaped
 * shell so it reads as a mobile-first product even on desktop. On true
 * mobile widths (< 480px) it collapses to fill the viewport with no chrome.
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--cup-paper)]">
      {/* Soft ambient glow on desktop only — purely decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden md:block"
        style={{
          background:
            'radial-gradient(ellipse at 50% -10%, rgba(244,162,97,0.18), transparent 60%), radial-gradient(ellipse at 50% 110%, rgba(15,118,110,0.10), transparent 60%)',
        }}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--cup-paper)] md:my-6 md:min-h-[calc(100vh-3rem)] md:rounded-[40px] md:shadow-elevated md:ring-1 md:ring-[var(--cup-stroke)]">
        {children}
      </div>
    </div>
  );
}
