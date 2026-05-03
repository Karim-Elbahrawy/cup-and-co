import Image from 'next/image';

interface LogoProps {
  /** Render the wordmark + tagline alongside the monogram. */
  showWordmark?: boolean;
  size?: number;
  className?: string;
}

/**
 * Cup & Co logo. The monogram lives in `/public/brand/monogram.svg` and the
 * full wordmark in `/public/brand/wordmark.svg`. Use `showWordmark` for
 * splash/auth screens; the bare monogram is used in headers + bottom nav.
 */
export function Logo({ showWordmark = false, size = 48, className }: LogoProps) {
  if (showWordmark) {
    return (
      <Image
        src="/brand/wordmark.svg"
        alt="Cup & Co — Your morning, handled"
        width={size * 3.75}
        height={size}
        priority
        className={className}
      />
    );
  }
  return (
    <Image
      src="/brand/monogram.svg"
      alt="Cup & Co"
      width={size}
      height={size}
      priority
      className={className}
    />
  );
}
