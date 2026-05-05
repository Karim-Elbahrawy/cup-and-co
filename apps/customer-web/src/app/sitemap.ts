import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cup-and-co-customer.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  // Public pages only — authed routes and order/profile pages are excluded
  // (also blocked in robots.ts).
  return [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
