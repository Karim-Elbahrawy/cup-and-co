import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cup-and-co/design-tokens', '@cup-and-co/i18n', '@cup-and-co/types'],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

// Sentry: wraps the Next.js config to add source-map upload, error capture,
// and route-handler instrumentation. No-op when SENTRY_AUTH_TOKEN is unset
// (e.g., local dev), so contributors don't need a Sentry account to build.
// Phase 1.1 of docs/UPGRADE-PLAN.md.
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Hides source maps from generated client bundles (sourcemaps still uploaded
  // to Sentry for symbolication, just not exposed to end users).
  hideSourceMaps: true,
  // Keep the size of the Sentry SDK reasonable.
  disableLogger: true,
  // Tunnel route to bypass ad-blockers that block sentry.io requests.
  tunnelRoute: '/monitoring',
};

export default withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions);
