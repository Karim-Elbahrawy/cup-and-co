/**
 * On wider viewports the customer-web app is centered inside a phone-shaped
 * shell so it reads as a mobile-first product even on desktop. On true
 * mobile widths (< 480px) it collapses to fill the viewport with no chrome.
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--cup-paper)]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col bg-[var(--cup-paper)] md:shadow-sm">
        {children}
      </div>
    </div>
  );
}
