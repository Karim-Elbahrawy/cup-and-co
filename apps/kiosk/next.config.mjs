/**
 * Cup & Co Kiosk — Next.js config.
 *
 * Lean by design. The kiosk runs as an installed iPad PWA in Guided Access,
 * not a public web page, so we skip Sentry/PostHog/next-intl wrappers used by
 * customer-web. Telemetry will land later (a kiosk-tagged Sentry init in K6
 * once we have multiple devices in the field).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cup-and-co/design-tokens', '@cup-and-co/i18n', '@cup-and-co/types'],
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Camera off — kiosk never scans QR; mic/geo off — never used.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
