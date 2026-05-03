import type { Config } from 'tailwindcss';
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
      },
      fontSize: Object.fromEntries(
        Object.entries(fontSizes).map(([k, v]) => [k, `${v}px`]),
      ) as Config['theme'] extends infer T ? T extends { fontSize?: infer F } ? F : never : never,
      fontFamily: {
        heading: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
