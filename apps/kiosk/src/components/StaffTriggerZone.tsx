'use client';

import { useStaffAccess } from '@/lib/useStaffAccess';

/**
 * Invisible quadruple-tap target that lives in a fixed corner across
 * every kiosk surface (mounted in AppShell).
 *
 * Geometry: 80×80px, fixed end-side bottom (the right corner in LTR /
 * left corner in RTL). The cart pill normally lives at `bottom-end-8`
 * but only when the cart has lines, so collisions are rare; even when
 * the pill is showing, the staff zone sits beneath it (lower z-index).
 *
 * The zone is a real `<button>` so it's keyboard- and screen-reader
 * navigable for diagnostics use, but with `aria-hidden=true` so customers
 * never trip over it. The visible label is empty.
 *
 * Tap detection sits in the store — this component is just a click sink
 * that calls `registerTriggerTap()` and the store does the windowing.
 */
export function StaffTriggerZone() {
  const registerTriggerTap = useStaffAccess((s) => s.registerTriggerTap);

  return (
    <button
      type="button"
      aria-hidden="true"
      tabIndex={-1}
      onClick={() => registerTriggerTap()}
      onKeyDown={(e) => {
        // Hidden key combo for diagnostics: triple-press 'S' on a Bluetooth
        // keyboard plugged into the iPad. Not advertised; staff who know
        // know.
        if (e.key === 's' && e.altKey && e.shiftKey) {
          for (let i = 0; i < 4; i += 1) registerTriggerTap();
        }
      }}
      className="fixed bottom-0 end-0 z-[40] h-20 w-20 cursor-default opacity-0"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    />
  );
}
