'use client';

import { motion } from 'framer-motion';

/**
 * Tiny espresso cup — covers espresso romano, ristretto, single shots.
 *
 * Visually distinct from the hot-milk class: short tulip cup, dark
 * espresso fill with a creamy crema layer on top. Lemon-zest twist
 * appears for romano-style shots; toggleable via the `twist` prop.
 *
 * No size scale — espresso shots are always demitasse-sized.
 */

interface EspressoShotProps {
  /** Lemon zest twist garnish (espresso romano). */
  twist?: boolean;
  /** Number of espresso shots — 1 or 2. Affects fill height. */
  shots?: 1 | 2;
  showSteam?: boolean;
}

export function EspressoShot({
  twist = false,
  shots = 1,
  showSteam = true,
}: EspressoShotProps) {
  return (
    <svg
      viewBox="0 0 360 420"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="demitasse" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EFE9DF" />
        </linearGradient>
        <radialGradient id="espresso-deep" cx="0.45" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#7A4A30" />
          <stop offset="65%" stopColor="#3F2317" />
          <stop offset="100%" stopColor="#1B0E08" />
        </radialGradient>
        <linearGradient id="crema" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D9A06A" />
          <stop offset="100%" stopColor="#B97840" />
        </linearGradient>
      </defs>

      {/* Saucer */}
      <ellipse cx="180" cy="378" rx="130" ry="16" fill="#FAF5EA" />
      <ellipse cx="180" cy="376" rx="128" ry="11" fill="#FFFFFF" opacity="0.5" />

      {/* Cup body */}
      <path
        d="M 130 240
           Q 130 360 180 360
           Q 230 360 230 240
           Z"
        fill="url(#demitasse)"
        stroke="#D8CDB6"
        strokeWidth="2"
      />

      {/* Handle */}
      <path
        d="M 230 270
           Q 270 280 270 320
           Q 270 350 230 350"
        fill="none"
        stroke="#D8CDB6"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Cup interior shadow */}
      <ellipse cx="180" cy="240" rx="51" ry="14" fill="#1F140C" />

      {/* Espresso fill — animates between 1 and 2 shots height */}
      <motion.ellipse
        cx="180"
        cy={shots === 2 ? 238 : 240}
        rx="48"
        ry="11"
        animate={{ ry: shots === 2 ? 11 : 9 }}
        transition={{ duration: 0.22 }}
        fill="url(#espresso-deep)"
      />

      {/* Crema (golden-brown layer on espresso) */}
      <motion.ellipse
        cx="180"
        cy="236"
        rx="46"
        ry="3"
        fill="url(#crema)"
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22 }}
      />

      {/* Twist of lemon (romano garnish) */}
      <motion.path
        d="M 158 230
           Q 162 218 178 222
           Q 192 226 198 220
           Q 200 214 196 216
           Q 184 224 172 220
           Q 158 218 158 230 Z"
        fill="#F5C443"
        stroke="#C28F1A"
        strokeWidth="1.5"
        animate={{ opacity: twist ? 1 : 0, y: twist ? 0 : 6 }}
        transition={{ duration: 0.22 }}
      />

      {/* Steam */}
      {showSteam ? (
        <g>
          {[0, 1].map((i) => (
            <motion.path
              key={i}
              d={`M ${168 + i * 24} 200
                  Q ${172 + i * 24} 180 ${168 + i * 24} 160
                  Q ${164 + i * 24} 144 ${170 + i * 24} 128`}
              stroke="#C8B898"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: -8, opacity: [0, 0.55, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.65,
              }}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
