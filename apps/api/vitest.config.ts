import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    env: {
      ALLOW_HEADER_AUTH_BYPASS: '1',
      DEV_OTP_OVERRIDE: '000000',
      JWT_SECRET: 'test-only-secret-must-be-at-least-32-characters-long',
      PAYMOB_HMAC_SECRET: 'test-only-paymob-hmac-secret-32chars-min',
      // Force FALLBACK fixture for catalog/products. Without these overrides
      // tests would silently hit whatever Supabase project the dev's .env
      // points at — making CI non-hermetic and depending on remote DB state.
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_ANON_KEY: '',
    },
  },
  resolve: {
    alias: {
      '@cup-and-co/types': new URL('../../packages/types/src/index.ts', import.meta.url).pathname,
    },
  },
});
