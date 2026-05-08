'use client';

import { useRouter } from 'next/navigation';
import { AttractScreen } from '@/components/AttractScreen';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLang } from '@/lib/useLang';

/**
 * Home route — the attract loop. Tap anywhere advances to /catalog.
 *
 * Language toggle is also surfaced here so a customer who reads Arabic
 * can flip it before they even start tapping. The toggle is positioned
 * top-left (the NetStatusPill is also top-left, but lower z-index — they
 * stack vertically without overlap thanks to the pill's small footprint).
 */
export default function KioskHome() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);

  return (
    <>
      <div className="absolute right-8 top-8 z-30">
        <LanguageToggle />
      </div>
      <AttractScreen
        tapToOrderText={lang === 'ar' ? 'اطلب الآن' : 'TAP TO ORDER'}
        subtitleText={
          lang === 'ar' ? 'صباحك معانا' : 'Your morning, handled.'
        }
        onActivate={() => {
          // Prefetch was already triggered on first paint by Next's RSC layer.
          router.push('/catalog');
        }}
      />
    </>
  );
}
