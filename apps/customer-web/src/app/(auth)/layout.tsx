import { PhoneFrame } from '@/components/PhoneFrame';

/**
 * Auth shell — centers the phone-frame on desktop and removes any chrome
 * (no bottom nav, no header). Each auth screen draws its own header.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PhoneFrame>{children}</PhoneFrame>;
}
