/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cup-and-co/design-tokens', '@cup-and-co/i18n', '@cup-and-co/types'],
};

export default nextConfig;
