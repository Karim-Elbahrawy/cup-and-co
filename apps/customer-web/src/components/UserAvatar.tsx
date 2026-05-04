'use client';

import Image from 'next/image';

interface UserAvatarProps {
  name?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_STYLES = {
  sm: 'h-11 w-11 text-[13px]',
  md: 'h-16 w-16 text-xl',
  lg: 'h-20 w-20 text-2xl',
} as const;

function getInitials(name?: string | null, phone?: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase();
  }

  if (phone) return phone.slice(-2);
  return 'U';
}

export function UserAvatar({ name, phone, avatarUrl, size = 'md', className = '' }: UserAvatarProps) {
  const initials = getInitials(name, phone);
  const showInitialBadge = Boolean(name);

  return (
    <div
      className={[
        'relative isolate shrink-0 overflow-hidden rounded-full ring-1 ring-white/75 shadow-[0_8px_20px_rgba(28,25,23,0.14)]',
        SIZE_STYLES[size],
        className,
      ].join(' ')}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" fill sizes="80px" className="object-cover" />
      ) : (
        <>
          <Image
            src="/brand/avatar-placeholder.svg"
            alt=""
            fill
            sizes="80px"
            className="object-cover"
          />
          {showInitialBadge ? (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[rgba(28,25,23,0.74)] px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              {initials}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
