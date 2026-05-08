'use client';

import { motion } from 'framer-motion';

/**
 * Layered cold coffee — covers cold brew, iced americano, iced latte,
 * vanilla cold brew, etc.
 *
 * Layer stack (bottom → top):
 *   1. Tall glass body
 *   2. Coffee fill
 *   3. Ice cubes (animated count: none / less / normal / extra)
 *   4. Milk swirl (toggleable — only when milk is added)
 *   5. Whipped cream (toggle)
 *   6. Straw
 *   7. Condensation droplets on the glass exterior (decorative)
 *
 * The glass is intentionally tall + narrow — visually distinct from the
 * hot-milk cup so the customer can read drink type at a glance.
 */

interface ColdCoffeeProps {
  sizeScale: number;
  ice: 'none' | 'less' | 'normal' | 'extra';
  /** null = no milk swirl. */
  milkTint: string | null;
  whippedCream: boolean;
  syrupTint: string | null;
  showCondensation?: boolean;
}

export function ColdCoffee({
  sizeScale,
  ice,
  milkTint,
  whippedCream,
  syrupTint,
  showCondensation = true,
}: ColdCoffeeProps) {
  const cubeCount = { none: 0, less: 2, normal: 4, extra: 6 }[ice];

  // Pre-positioned cube spots inside the glass so animating count just
  // toggles opacity per cube instead of layout-thrashing.
  const cubes = [
    { x: 152, y: 220, rot: 12 },
    { x: 188, y: 230, rot: -8 },
    { x: 158, y: 260, rot: 22 },
    { x: 192, y: 270, rot: -16 },
    { x: 168, y: 295, rot: 6 },
    { x: 196, y: 305, rot: -22 },
  ];

  return (
    <motion.svg
      viewBox="0 0 360 420"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="glass-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.10" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.10" />
        </linearGradient>
        <linearGradient id="coffee-cold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A341E" />
          <stop offset="100%" stopColor="#28140C" />
        </linearGradient>
        <radialGradient id="ice-shine" cx="0.3" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#C8E0EA" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id="saucer-cold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FAF5EA" />
          <stop offset="100%" stopColor="#D9CFB8" />
        </linearGradient>
      </defs>

      {/* Coaster (flatter than the hot-drink saucer) */}
      <ellipse cx="180" cy="378" rx="120" ry="12" fill="url(#saucer-cold)" />

      <motion.g
        animate={{ scaleX: sizeScale }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
        style={{ originX: '180px', originY: '370px' }}
      >
        {/* Glass — outline path */}
        <path
          d="M 130 130
             L 138 365
             Q 138 372 145 372
             L 215 372
             Q 222 372 222 365
             L 230 130
             Z"
          fill="url(#glass-body)"
          stroke="#D6E2EA"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Coffee fill (cold brew = nearly opaque dark brown) */}
        <path
          d="M 134 158
             L 141 365
             Q 141 369 145 369
             L 215 369
             Q 219 369 219 365
             L 226 158
             Z"
          fill="url(#coffee-cold)"
          opacity="0.96"
        />

        {/* Milk swirl — animate fill */}
        <motion.path
          d="M 144 220
             Q 180 200 216 220
             Q 200 245 180 235
             Q 160 245 144 220 Z"
          animate={{
            fill: milkTint ?? '#F5EFDD',
            opacity: milkTint ? 0.55 : 0,
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />

        {/* Syrup ribbon at the bottom */}
        <motion.path
          d="M 145 330 Q 180 345 215 330"
          stroke={syrupTint ?? '#A85A0E'}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={{ opacity: syrupTint ? 0.85 : 0 }}
          transition={{ duration: 0.22 }}
        />

        {/* Ice cubes — opacity per cube based on count */}
        <g>
          {cubes.map((c, i) => (
            <motion.g
              key={i}
              animate={{
                opacity: i < cubeCount ? 1 : 0,
                scale: i < cubeCount ? 1 : 0.8,
              }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: i * 0.04 }}
              style={{ transformOrigin: `${c.x}px ${c.y}px` }}
            >
              <rect
                x={c.x - 14}
                y={c.y - 14}
                width="28"
                height="28"
                rx="4"
                transform={`rotate(${c.rot} ${c.x} ${c.y})`}
                fill="url(#ice-shine)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeOpacity="0.7"
              />
            </motion.g>
          ))}
        </g>

        {/* Whipped cream — toggle */}
        <motion.path
          d="M 138 138
             Q 158 100 178 122
             Q 198 95 218 122
             Q 232 105 232 138
             Q 200 152 138 138 Z"
          fill="#FFFFFF"
          stroke="#E9DFC9"
          strokeWidth="1.5"
          animate={{ opacity: whippedCream ? 1 : 0, y: whippedCream ? 0 : 14 }}
          transition={{ duration: 0.25 }}
        />

        {/* Straw */}
        <g>
          <rect
            x="200"
            y="80"
            width="10"
            height="200"
            rx="3"
            fill="#C2410C"
            transform="rotate(8 205 180)"
          />
          <rect
            x="204"
            y="80"
            width="3"
            height="200"
            rx="1.5"
            fill="#FFFFFF"
            opacity="0.65"
            transform="rotate(8 205 180)"
          />
        </g>

        {/* Condensation droplets on the glass */}
        {showCondensation ? (
          <g aria-hidden="true">
            {[
              [126, 200],
              [120, 250],
              [128, 290],
              [232, 210],
              [238, 260],
              [232, 300],
            ].map(([cx, cy], i) => (
              <motion.circle
                key={i}
                cx={cx}
                cy={cy}
                r="3"
                fill="#FFFFFF"
                opacity="0.8"
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 4, opacity: [0, 0.8, 0] }}
                transition={{
                  duration: 4 + (i % 3),
                  repeat: Infinity,
                  ease: 'easeIn',
                  delay: i * 0.45,
                }}
              />
            ))}
          </g>
        ) : null}
      </motion.g>
    </motion.svg>
  );
}
