export const colors = {
  primaryOrange: '#FF8B3D',
  secondaryOrange: '#FFA329',
  creamHighlight: '#FFE2BD',
  paperBackground: '#FFF1DC',
  surface: '#FFF8EE',
  coffeeBrown: '#3D2914',
  mutedText: '#8B7E6E',
  stroke: '#F0E5D6',
  successGreen: '#4CAF50',
  errorRed: '#E53935',
  warningAmber: '#FFB300',
  starYellow: '#FFC107',
  white: '#FFFFFF',
  black: '#000000',
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
  card: 16,
  pill: 24,
  full: 9999,
} as const;

export const shadows = {
  card: '0 4px 16px rgba(61, 41, 20, 0.08)',
  elevated: '0 8px 24px rgba(61, 41, 20, 0.12)',
  subtle: '0 2px 8px rgba(61, 41, 20, 0.05)',
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
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const tailwindColors = {
  'cup-orange': {
    DEFAULT: colors.primaryOrange,
    50: '#FFF4EB',
    100: '#FFE8D6',
    200: '#FFD1AD',
    300: '#FFBA85',
    400: '#FFA85C',
    500: colors.primaryOrange,
    600: '#E06A1F',
    700: '#B85218',
    800: '#8F3D12',
    900: '#66290C',
  },
  'cup-cream': {
    DEFAULT: colors.creamHighlight,
    50: colors.surface,
    100: colors.paperBackground,
    200: colors.creamHighlight,
    300: '#FFD4A3',
    400: '#FFC580',
  },
  'cup-brown': {
    DEFAULT: colors.coffeeBrown,
    50: '#F5F0EB',
    100: '#E8DDD3',
    200: '#D1BBA8',
    300: '#BA997C',
    400: '#8B6B4A',
    500: colors.coffeeBrown,
    600: '#331F0F',
    700: '#29180C',
    800: '#1F1209',
    900: '#140C06',
  },
  'cup-muted': colors.mutedText,
  'cup-stroke': colors.stroke,
  'cup-success': colors.successGreen,
  'cup-error': colors.errorRed,
  'cup-warning': colors.warningAmber,
  'cup-star': colors.starYellow,
} as const;
