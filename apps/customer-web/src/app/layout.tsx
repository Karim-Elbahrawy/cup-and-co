import type { Metadata, Viewport } from 'next';
import { Inter, Sora, Cairo } from 'next/font/google';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-arabic' });

export const metadata: Metadata = {
  title: 'Cup & Co — Your morning, handled',
  description: 'Order ahead, skip the line. Coffee, breakfast, and desserts on campus.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cup & Co',
  },
};

export const viewport: Viewport = {
  themeColor: '#FF8B3D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${sora.variable} ${inter.variable} ${cairo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
