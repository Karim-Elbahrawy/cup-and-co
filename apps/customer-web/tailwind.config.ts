import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { tailwindColors, radius, shadows, fontSizes } from '@cup-and-co/design-tokens';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tailwindColors as unknown as Record<string, string>,
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
      fontSize: Object.fromEntries(
        Object.entries(fontSizes).map(([k, v]) => [k, `${v}px`]),
      ) as Config['theme'] extends infer T ? T extends { fontSize?: infer F } ? F : never : never,
      fontFamily: {
        heading: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'system-ui', 'sans-serif'],
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
      });
    }),
  ],
};

export default config;
