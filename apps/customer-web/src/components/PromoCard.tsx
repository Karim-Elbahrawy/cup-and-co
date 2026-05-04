'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';

interface PromoCardProps {
  ctaLabel: string;
  featuredImageUrl?: string | null;
  posterImageUrl: string;
  theme?: 'cold' | 'hot';
  onCtaClick?: () => void;
}

/**
 * Poster-led promo card. The poster is generated first as a single SVG layer,
 * then the cutout cup sits on top as the only animated element.
 */
export function PromoCard({
  ctaLabel,
  featuredImageUrl,
  posterImageUrl,
  theme = 'cold',
  onCtaClick,
}: PromoCardProps) {
  const reduce = useReducedMotion();
  const isCold = theme === 'cold';

  return (
    <section
      aria-label="Promotional offer"
      className="relative isolate min-h-[390px] overflow-hidden rounded-[30px] border border-[rgba(120,86,55,0.14)] shadow-[0_22px_48px_rgba(61,41,20,0.16)]"
    >
      <Image
        src={posterImageUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 420px"
        className="object-cover"
        priority={false}
      />

      {featuredImageUrl ? (
        <motion.div
          className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 ${
            isCold
              ? 'bottom-[58px] h-[270px] w-[270px] sm:bottom-[56px] sm:h-[292px] sm:w-[292px]'
              : 'bottom-[78px] h-[220px] w-[220px] sm:bottom-[74px] sm:h-[236px] sm:w-[236px]'
          }`}
          animate={
            reduce
              ? undefined
              : isCold
                ? { y: [0, -7, 0], rotate: [-7, -4, -7] }
                : { y: [0, -5, 0], rotate: [0, 2, 0], scale: [1, 1.02, 1] }
          }
          transition={reduce ? undefined : { duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image
            src={featuredImageUrl}
            alt=""
            fill
            sizes="274px"
            className="object-contain drop-shadow-[0_24px_34px_rgba(61,41,20,0.28)]"
            priority={false}
          />
        </motion.div>
      ) : null}

      <div className="relative z-30 flex min-h-[390px] items-end justify-end p-5">
        <button
          type="button"
          onClick={onCtaClick}
          className="inline-flex items-center gap-2 rounded-full bg-[rgba(28,25,23,0.92)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_22px_rgba(28,25,23,0.22)] backdrop-blur-sm transition active:scale-[0.98]"
        >
          {ctaLabel}
          <span aria-hidden="true">-&gt;</span>
        </button>
      </div>
    </section>
  );
}
