import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function secret(name: string): string {
  const v = process.env[name];
  if (!v || v.length < 32) {
    throw new Error(`Missing or too-short secret: ${name} (must be ≥32 chars)`);
  }
  return v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Env var ${name} must be a number`);
  return n;
}

export const config = {
  port: num('PORT', 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  supabase: {
    url: required('SUPABASE_URL', 'http://127.0.0.1:54321'),
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },

  jwt: {
    secret: secret('JWT_SECRET'),
  },

  paymob: {
    apiKey: process.env.PAYMOB_API_KEY ?? '',
    hmacSecret: secret('PAYMOB_HMAC_SECRET'),
    integrationIdCard: process.env.PAYMOB_INTEGRATION_ID_CARD ?? '',
    integrationIdWallet: process.env.PAYMOB_INTEGRATION_ID_WALLET ?? '',
    iframeId: process.env.PAYMOB_IFRAME_ID ?? '',
    checkoutBaseUrl: 'https://accept.paymob.com/unifiedcheckout',
  },

  loyalty: {
    onlineMultiplier: num('LOYALTY_ONLINE_MULTIPLIER', 1.0),
    cashMultiplier: num('LOYALTY_CASH_MULTIPLIER', 0.5),
    qrMultiplier: num('LOYALTY_QR_MULTIPLIER', 0.25),
    pointsPerBlock: num('LOYALTY_POINTS_PER_DISCOUNT_BLOCK', 100),
    discountEgpPerBlock: num('LOYALTY_DISCOUNT_EGP_PER_BLOCK', 5),
  },

  game: {
    durationSeconds: num('GAME_DURATION_SECONDS', 60),
    maxScore: num('GAME_MAX_SCORE', 300),
    dailySessionsPerUser: num('GAME_DAILY_SESSIONS_PER_USER', 3),
  },
} as const;
