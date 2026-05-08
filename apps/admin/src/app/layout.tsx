import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Cup & Co — Admin',
  description: 'Run the kiosk: live orders, menu availability, QR receipts, today revenue.',
  icons: {
    // Using the CUP&CO logo as the favicon.
    // To swap in the final PNG: drop it into public/ as favicon.png and
    // change the path below to '/favicon.png'.
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cup-paper font-body text-cup-brown-900 antialiased">
        {children}
      </body>
    </html>
  );
}
