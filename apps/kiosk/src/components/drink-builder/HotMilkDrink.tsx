'use client';

import { motion } from 'framer-motion';

/**
 * Layered hot-milk drink — covers cappuccino, latte, mocha, flat white,
 * hazelnut latte, spanish latte, and friends.
 *
 * Layer stack (bottom → top):
 *   1. Saucer
 *   2. Cup body (white ceramic)
 *   3. Cup interior (warm shadow)
 *   4. Espresso base (always visible)
 *   5. Milk fill (tint varies by milk choice)
 *   6. Foam dome (cappuccino: tall; latte: low; flat white: very low)
 *   7. Syrup drizzle (color depends on syrup choice)
 *   8. Whipped cream (toggleable extra)
 *   9. Cocoa dusting (mocha) — controlled by syrup tint
 *  10. Steam wisps (decorative, always animating)
 *
 * Layers are <motion.g> with `animate` driven by props so toggling a
 * chip on the customize screen shows the change live. Transitions are
 * 220ms ease-out — fast enough to feel direct, slow enough to read.
 */

interface HotMilkDrinkProps {
  /** 0.86 – 1.12; scales cup width only (height stays constant). */
  sizeScale: number;
  milkTint: string;
  /** null = no syrup line. */
  syrupTint: string | null;
  whippedCream: boolean;
  /** Used to vary foam height: cappuccino > latte > flat white. */
  foamLevel: 'tall' | 'normal' | 'low';
  /** Animate steam wisps. Disabled under reduced-motion via globals.css. */
  showSteam?: boolean;
}

export function HotMilkDrink({
  sizeScale,
  milkTint,
  syrupTint,
  whippedCream,
  foamLevel,
  showSteam = true,
}: HotMilkDrinkProps) {
  // Foam dome height in user units. Cappuccino is generous; flat white
  // barely peeks above the rim.
  const foamHeight = { tall: 38, normal: 24, low: 14 }[foamLevel];

  return (
    <motion.svg
      viewBox="0 0 360 420"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cup-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EFE9DF" />
        </linearGradient>
        <linearGradient id="cup-interior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3E2A1F" />
          <stop offset="100%" stopColor="#1F140C" />
        </linearGradient>
        <radialGradient id="espresso-shine" cx="0.4" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#7A4A30" />
          <stop offset="60%" stopColor="#3F2317" />
          <stop offset="100%" stopColor="#1B0E08" />
        </radialGradient>
        <radialGradient id="foam-shine" cx="0.5" cy="0.35" r="0.5">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#F0E8D8" stopOpacity="0.9" />
        </radialGradient>
        <linearGradient id="saucer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FAF5EA" />
          <stop offset="100%" stopColor="#D9CFB8" />
        </linearGradient>
      </defs>

      {/* Group everything that scales horizontally with size */}
      <motion.g
        animate={{ scaleX: sizeScale }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
        style={{ originX: '180px', originY: '300px' }}
      >
        {/* Saucer — wide ellipse base */}
        <ellipse cx="180" cy="378" rx="150" ry="20" fill="url(#saucer)" />
        <ellipse cx="180" cy="376" rx="148" ry="14" fill="#FFFFFF" opacity="0.5" />

        {/* Cup outer body */}
        <path
          d="M 90 180
             Q 90 360 180 360
             Q 270 360 270 180
             Z"
          fill="url(#cup-body)"
          stroke="#D8CDB6"
          strokeWidth="2"
        />

        {/* Handle */}
        <path
          d="M 270 220
             Q 320 230 320 280
             Q 320 320 270 320"
          fill="none"
          stroke="#D8CDB6"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 270 240
             Q 305 248 305 280
             Q 305 308 270 308"
          fill="none"
          stroke="#FAF6F0"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Cup interior — clipped opening at the top */}
        <ellipse cx="180" cy="180" rx="92" ry="22" fill="url(#cup-interior)" />

        {/* Espresso base layer — always visible */}
        <ellipse cx="180" cy="180" rx="86" ry="18" fill="url(#espresso-shine)" />

        {/* Milk layer — animate tint between milk choices */}
        <motion.ellipse
          cx="180"
          cy="178"
          rx="80"
          ry="14"
          animate={{ fill: milkTint }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          opacity="0.85"
        />

        {/* Syrup drizzle (animates in/out) */}
        <motion.path
          d="M 130 174 Q 150 184 170 172 Q 200 188 220 174 Q 240 186 232 178"
          stroke={syrupTint ?? '#A85A0E'}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{ opacity: syrupTint ? 0.85 : 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        />

        {/* Foam dome — animates height with foamLevel */}
        <motion.ellipse
          cx="180"
          cy="180"
          rx="78"
          fill="url(#foam-shine)"
          animate={{ ry: foamHeight, opacity: foamHeight > 0 ? 1 : 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ transformOrigin: '180px 180px' }}
        />
        {/* Subtle micro-foam dots on top of the foam */}
        <motion.g
          animate={{ opacity: foamHeight > 16 ? 0.7 : 0 }}
          transition={{ duration: 0.22 }}
        >
          {[
            [148, 168],
            [170, 158],
            [200, 162],
            [218, 172],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2" fill="#FFFFFF" opacity="0.8" />
          ))}
        </motion.g>

        {/* Whipped cream — toggle */}
        <motion.path
          d="M 130 168
             Q 145 130 165 145
             Q 180 110 195 145
             Q 215 130 230 168
             Q 200 185 130 168 Z"
          fill="#FFFFFF"
          stroke="#E9DFC9"
          strokeWidth="1.5"
          animate={{
            opacity: whippedCream ? 1 : 0,
            y: whippedCream ? 0 : 12,
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />

        {/* Cocoa dusting — only when syrupTint is mocha-ish (dark) */}
        <motion.g
          animate={{
            opacity:
              syrupTint && /^#3E2218|3E2|#3E22/i.test(syrupTint) ? 0.55 : 0,
          }}
          transition={{ duration: 0.22 }}
        >
          {[
            [150, 165],
            [165, 158],
            [185, 162],
            [205, 158],
            [220, 165],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.4" fill="#3E2218" />
          ))}
        </motion.g>
      </motion.g>

      {/* Steam — outside the size group so it doesn't squish */}
      {showSteam ? (
        <g aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.path
              key={i}
              d={`M ${156 + i * 20} 130
                  Q ${162 + i * 20} 110 ${156 + i * 20} 92
                  Q ${150 + i * 20} 76 ${158 + i * 20} 60`}
              stroke="#C8B898"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.55"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: -10, opacity: [0, 0.6, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * 0.7,
              }}
            />
          ))}
        </g>
      ) : null}
    </motion.svg>
  );
}
