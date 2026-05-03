/**
 * Small formatting helpers shared across admin screens.
 */

const EGP = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatEgp(amount: number): string {
  if (!Number.isFinite(amount)) return 'EGP 0';
  return `EGP ${EGP.format(Math.round(amount))}`;
}

/** "2m ago", "12m ago", "1h 4m ago" — succinct for kanban cards. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const diffMs = Math.max(0, now.getTime() - then);
  const totalMinutes = Math.floor(diffMs / 60_000);
  if (totalMinutes < 1) return 'just now';
  if (totalMinutes < 60) return `${totalMinutes}m ago`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h ago`;
  return `${hours}h ${minutes}m ago`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
