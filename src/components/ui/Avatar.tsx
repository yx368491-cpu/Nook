import { forwardRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarStatus = 'online' | 'offline';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLSpanElement>, 'src'> {
  name?: string;
  initials?: string;
  src?: string | null;
  size?: AvatarSize;
  status?: AvatarStatus;
  pulse?: boolean;
  withName?: boolean;
  children?: ReactNode;
  className?: string;
  asChild?: boolean;
}

const sizeMap: Record<AvatarSize, { px: number; font: string; dot: number }> = {
  sm: { px: 24, font: 'var(--font-size-micro)', dot: 5 },
  md: { px: 32, font: 'var(--font-size-meta)', dot: 6 },
  lg: { px: 48, font: 'var(--font-size-h3)', dot: 8 },
};

function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return '·';
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed[0] ?? '·';
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return trimmed[0] ?? '·';
}

function hashCode(s: string): number {
  return [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) | 0, 5381);
}

function getAvatarBg(name: string | undefined): string {
  if (!name) return 'var(--color-surface-3)';
  const offset = Math.abs(hashCode(name)) % 12 - 6;
  return `var(--color-accent-default)`; // v1.0 simplified
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({
    name,
    initials: explicitInitials,
    src,
    size = 'md',
    status,
    pulse = true,
    withName = false,
    children,
    className = '',
    ...props
  }, ref) => {
    const [imgError, setImgError] = useState(false);
    const dims = sizeMap[size];
    const hasImage = src && !imgError;

    const initials = explicitInitials ?? getInitials(name ?? '');
    const bgColor = getAvatarBg(name);

    const avatarContent = hasImage ? (
      <img
        src={src!}
        alt={name ? `${name}的头像` : 'Avatar'}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    ) : (
      <span
        className="flex items-center justify-center w-full h-full select-none"
        style={{
          backgroundColor: bgColor,
          color: 'var(--color-accent-on)',
          fontSize: dims.font,
          fontWeight: 500,
        }}
      >
        {initials}
      </span>
    );

    const avatar = (
      <span
        ref={ref}
        role="img"
        aria-label={name ? `${name} 的头像${status === 'online' ? '，在线' : status === 'offline' ? '，离线' : ''}` : undefined}
        className={`relative inline-flex items-center justify-center flex-shrink-0 rounded-[var(--radius-circle)] overflow-hidden ${className}`}
        style={{ width: dims.px, height: dims.px }}
        {...props}
      >
        {avatarContent}
        {status && (
          <span
            className={`absolute -bottom-[1px] -right-[1px] rounded-[var(--radius-circle)] outline-[2px] outline-[var(--color-canvas-default)]`}
            style={{
              width: dims.dot,
              height: dims.dot,
              backgroundColor: status === 'online' ? 'var(--color-chat-status-online)' : 'var(--color-chat-status-offline)',
              outlineStyle: 'solid',
              animation: status === 'online' && pulse ? 'ambient-pulse var(--duration-ambient) ease-in-out infinite' : undefined,
            }}
          />
        )}
      </span>
    );

    if (withName) {
      return (
        <span className="inline-flex items-center gap-[var(--space-sm)]" role="group" aria-label={name}>
          {avatar}
          {children}
        </span>
      );
    }

    return avatar;
  },
);

Avatar.displayName = 'Nook.Avatar';
