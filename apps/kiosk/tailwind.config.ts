import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { tailwindColors, radius, shadows, fontSizes } from '@cup-and-co/design-tokens';

/**
 * Tailwind for the kiosk app.
 *
 * Mirrors customer-web's token wiring (same palette, same radii, same shadows)
 * so a developer moving between apps doesn't have to relearn class names. On
 * top of that we add a kiosk-only display-typography scale tuned for 12.9"
 * landscape iPads viewed from ~50cm away — bigger than the phone scale.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...(tailwindColors as unknown as Record<string, string>),
        // Semantic aliases so utilities like `bg-cup-primary`,
        // `text-cup-accent`, `bg-cup-paper`, etc. actually resolve.
        // Without these, JIT silently strips the class and you get
        // white-on-white CTAs (which is exactly what happened to the
        // 'Checkout' button before this fix).
        //
        // Kept as `extend` (not a replacement) so the legacy
        // `cup-orange-{50..900}` scale that customer-web depends on
        // continues to work unchanged.
        'cup-primary': '#C2410C',
        'cup-primary-hover': '#9A3412',
        'cup-primary-tint': '#FED7AA',
        'cup-accent': '#0F766E',
        'cup-accent-hover': '#115E59',
        'cup-accent-tint': '#CCFBF1',
        'cup-paper': '#FAF6F0',
        'cup-surface': '#FFFFFF',
        'cup-espresso': '#1C1917',
        'cup-cocoa': '#44403C',
        'cup-muted': '#78716C',
        'cup-stroke': '#E7E5E4',
        'cup-success': '#15803D',
        'cup-error': '#B91C1C',
        'cup-warning': '#D97706',
        'cup-star': '#F59E0B',
        'cup-sunrise-from': '#F4A261',
        'cup-sunrise-to': '#C2410C',
      },
      borderRadius: {
        chip: `${radius.chip}px`,
        card: `${radius.card}px`,
        pill: `${radius.pill}px`,
      },
      boxShadow: {
        card: shadows.card,
        elevated: shadows.elevated,
        subtle: shadows.subtle,
        'warm-glow': shadows.warmGlow,
      },
      fontSize: {
        ...(Object.fromEntries(
          Object.entries(fontSizes).map(([k, v]) => [k, `${v}px`]),
        ) as Record<string, string>),
        // Kiosk-only display scale. Numbers are sized for 12.9" iPad in
        // landscape, with the customer ~50cm from the screen.
        'k-display': ['96px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '800' }],
        'k-hero': ['64px', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '800' }],
        'k-card': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'k-body': ['22px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      fontFamily: {
        heading: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        // Big-touch primitives — see docs/KIOSK-PLAN.md K0.3.
        'touch-btn': '88px',
        'touch-card': '160px',
      },
      minWidth: {
        'touch-btn': '88px',
        'touch-card': '160px',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        // Disables long-press magnifier + text-selection callouts on iPad.
        // Critical for kiosk feel — no system menus popping over the UI.
        '.no-touch-callout': {
          '-webkit-touch-callout': 'none',
          '-webkit-user-select': 'none',
          'user-select': 'none',
        },
      });
    }),
  ],
};

export default config;
