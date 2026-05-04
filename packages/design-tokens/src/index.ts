/**
 * Cup & Co — "Espresso Sunrise" design tokens.
 *
 * Upgraded from the source Figma's saturated candy orange to a refined
 * terracotta primary with an unexpected deep teal as a secondary accent —
 * more grown-up specialty-coffee feel, distinctive against generic Figma kits.
 *
 * Tailwind class names (`cup-orange`, `cup-cream`, `cup-brown`, `cup-teal`)
 * stay stable so consumers don't churn; only the resolved hex values change.
 */

export const colors = {
  // Primary — terracotta (was: candy orange #FF8B3D)
  primary: '#C2410C',
  primaryHover: '#9A3412',
  primaryTint: '#FED7AA',

  // Secondary accent — deep teal (NEW; the differentiator)
  accent: '#0F766E',
  accentHover: '#115E59',
  accentTint: '#CCFBF1',

  // Sunrise gradient stops (used on hero promo card, splash)
  sunriseFrom: '#F4A261',
  sunriseTo: '#C2410C',

  // Warm fills
  cream: '#FEF3C7',
  paperBackground: '#F7F7F5',
  surface: '#FFFFFF',

  // Text
  espresso: '#1C1917',
  cocoa: '#44403C',
  mutedText: '#78716C',

  // Borders + states
  stroke: '#E7E5E4',
  successGreen: '#15803D',
  errorRed: '#B91C1C',
  warningAmber: '#D97706',
  starYellow: '#F59E0B',

  white: '#FFFFFF',
  black: '#000000',

  // Aliases kept so older files don't break — to be removed in Phase 6 cleanup.
  primaryOrange: '#C2410C',
  secondaryOrange: '#F4A261',
  creamHighlight: '#FEF3C7',
  coffeeBrown: '#1C1917',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 64,
} as const;

export const radius = {
  chip: 12,
  card: 20,
  pill: 999,
  full: 9999,
} as const;

export const shadows = {
  // Warm-tinted shadows (espresso 8% / 12% — never gray)
  card: '0 4px 16px rgba(28, 25, 23, 0.06)',
  elevated: '0 12px 32px rgba(28, 25, 23, 0.10)',
  subtle: '0 1px 4px rgba(28, 25, 23, 0.04)',
  warmGlow: '0 8px 24px rgba(194, 65, 12, 0.18)',
} as const;

export const typography = {
  web: {
    heading: "'Sora', sans-serif",
    body: "'Inter', sans-serif",
    arabic: "'Cairo', sans-serif",
  },
  ios: {
    heading: 'SF Pro Rounded',
    body: 'SF Pro Text',
  },
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const motion = {
  // Easing curves used across web + iOS (Framer Motion + SwiftUI animation)
  easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  durations: {
    fast: 120,
    base: 200,
    slow: 320,
    intro: 480,
  },
} as const;

/**
 * Tailwind palette. Class names like `bg-cup-orange-500` keep working — only
 * the underlying hex shifts to the upgraded Espresso Sunrise palette.
 */
export const tailwindColors = {
  // Terracotta scale (still exposed as `cup-orange-*` for stability)
  'cup-orange': {
    DEFAULT: colors.primary,
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: colors.primary,        // #C2410C
    700: '#9A3412',
    800: '#7C2D12',
    900: '#431407',
  },
  // New: deep teal accent
  'cup-teal': {
    DEFAULT: colors.accent,
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: colors.accent,         // #0F766E
    800: '#115E59',
    900: '#134E4A',
  },
  'cup-cream': {
    DEFAULT: colors.cream,
    50: '#FFFBF5',
    100: colors.paperBackground, // #F7F7F5
    200: colors.cream,           // #FEF3C7
    300: '#FDE68A',
    400: '#FCD34D',
  },
  // Espresso scale (still exposed as `cup-brown-*`)
  'cup-brown': {
    DEFAULT: colors.espresso,
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: colors.mutedText,       // #78716C
    600: '#57534E',
    700: colors.cocoa,           // #44403C
    800: '#292524',
    900: colors.espresso,        // #1C1917
  },
  'cup-paper': colors.paperBackground,
  'cup-surface': colors.surface,
  'cup-muted': colors.mutedText,
  'cup-stroke': colors.stroke,
  'cup-success': colors.successGreen,
  'cup-error': colors.errorRed,
  'cup-warning': colors.warningAmber,
  'cup-star': colors.starYellow,
} as const;
