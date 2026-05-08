import type { Metadata, Viewport } from 'next';
import { Inter, Sora, Cairo } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';

const sora = Sora({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-arabic' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_KIOSK_URL ?? 'https://cup-and-co-kiosk.vercel.app'),
  title: 'Cup & Co Kiosk',
  description: 'Self-ordering kiosk for Cup & Co.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    // standalone hides the Safari chrome when added to the iPad home screen,
    // which Guided Access then locks down further.
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cup & Co Kiosk',
  },
  icons: {
    apple: '/brand/app-icon-180.png',
    icon: '/favicon.svg',
  },
  // Search engines have no business indexing a kiosk URL — it's a
  // device-targeted PWA, not a public page.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#C2410C',
  // viewport-fit=cover lets the page draw under iPad notch/home-indicator
  // areas. Combined with the Guided-Access lock this is what makes the
  // kiosk feel "native".
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

/**
 * Root layout — kept deliberately thin. K0 ships only the typography hookup
 * and the `dir` attribute. Language switching, providers, idle reset, etc.
 * land in K1.6 / K1.9.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${sora.variable} ${inter.variable} ${cairo.variable}`}
    >
      <body className="no-touch-callout">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
