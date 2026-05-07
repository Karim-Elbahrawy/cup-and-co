import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cup-and-co/design-tokens', '@cup-and-co/i18n', '@cup-and-co/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    // Allow SVGs served from /public (individual product images use .svg)
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
};

export default withNextIntl(nextConfig);
