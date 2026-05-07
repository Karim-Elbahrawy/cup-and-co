// import Image from 'next/image';

interface LogoProps {
  /** When true, hides the wordmark — useful for the collapsed sidebar. */
  iconOnly?: boolean;
  /** Reserved for when the logo image is restored. */
  size?: number;
}

/**
 * Cup & Co sidebar wordmark.
 * The monogram image is commented out until brand assets are finalised.
 * To restore: un-comment the Image block, un-comment the import above,
 * and drop the finished artwork into `public/brand/monogram.svg`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Logo({ iconOnly = false, size: _size = 36 }: LogoProps) {
  if (iconOnly) return null;

  return (
    <div className="flex items-center gap-2.5">
      {/*
      <Image
        src="/brand/monogram.svg"
        alt="Cup & Co"
        width={_size}
        height={_size}
        priority
        className="shrink-0"
      />
      */}
      <div className="flex flex-col leading-tight">
        <span className="font-heading text-base font-bold tracking-tight text-cup-brown-900">
          Cup &amp; Co
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-orange-600">
          Admin
        </span>
      </div>
    </div>
  );
}
