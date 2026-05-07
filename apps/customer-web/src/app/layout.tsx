import type { Metadata, Viewport } from 'next';
import { Inter, Sora, Cairo } from 'next/font/google';
import './globals.css';
import { HtmlLangSync } from '@/components/HtmlLangSync';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { ThemeProvider, ThemeBootstrap } from '@/components/ThemeProvider';

const sora = Sora({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-arabic' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cup-and-co-customer.vercel.app'),
  title: 'Cup & Co — Your morning, handled',
  description: 'Order ahead, skip the line. Coffee, breakfast, and desserts on campus.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cup & Co',
  },
  icons: {
    apple: '/brand/app-icon-180.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Cup & Co',
    title: 'Cup & Co — Your morning, handled',
    description: 'Order ahead, skip the line. Coffee, breakfast, and desserts on campus.',
    images: [{ url: '/brand/og-card.svg', width: 1200, height: 630, alt: 'Cup & Co' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cup & Co — Your morning, handled',
    description: 'Order ahead, skip the line.',
    images: ['/brand/og-card.svg'],
  },
};

export const viewport: Viewport = {
  // Phase 8.2 — different status bar tint per scheme so iOS Safari
  // doesn't render a white bar over a dark UI (or vice versa).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#C2410C' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1715' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Don't disable user-scaling — that blocks zoom for low-vision users.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${sora.variable} ${inter.variable} ${cairo.variable}`}
    >
      <head>
        {/* Inline theme bootstrap — runs BEFORE React hydrates so we
            avoid the white-flash-then-dark on initial paint. Phase 8.2. */}
        <ThemeBootstrap />
      </head>
      <body>
        <HtmlLangSync />
        <AnalyticsProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
