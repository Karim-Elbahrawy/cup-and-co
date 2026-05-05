import Image from 'next/image';

interface LogoProps {
  /** When true, hides the wordmark — useful for the collapsed sidebar. */
  iconOnly?: boolean;
  size?: number;
}

/**
 * Cup & Co monogram + "Admin" wordmark. The monogram lives in
 * `public/brand/monogram.svg` and is shared with the customer web app.
 */
export function Logo({ iconOnly = false, size = 36 }: LogoProps) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <Image
        src="/brand/monogram.svg"
        alt=""
        width={size}
        height={size}
        priority
        className="shrink-0"
      />
      {!iconOnly && (
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="whitespace-nowrap font-heading text-base font-bold tracking-tight text-cup-brown-900">
            Cup &amp; Co
          </span>
          <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-orange-600">
            Admin
          </span>
        </div>
      )}
    </div>
  );
}
