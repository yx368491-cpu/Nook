/**
 * UnreadBadge — numeric chip (cap "99+") or simple dot.
 *
 * Returns null when `count <= 0` so consumers don't need to gate the prop
 * before mounting. Uses Nook design tokens (color-accent-default / -on,
 * font-size-micro, radius-pill) to stay aligned with the rest of the
 * chat surface.
 */
interface UnreadBadgeProps {
  count: number;
  variant?: 'numeric' | 'dot';
  className?: string;
}

export function UnreadBadge({
  count,
  variant = 'numeric',
  className = '',
}: UnreadBadgeProps) {
  if (count <= 0) return null;

  if (variant === 'dot') {
    return (
      <span
        aria-hidden="true"
        className={`inline-block w-[8px] h-[8px] rounded-[var(--radius-circle)] bg-[var(--color-accent-default)] ${className}`}
      />
    );
  }

  const display = count > 99 ? '99+' : String(count);
  return (
    <span
      role="status"
      aria-label={`${count} unread`}
      className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-[6px] text-[var(--font-size-micro)] font-[600] leading-none text-[var(--color-accent-on)] bg-[var(--color-accent-default)] rounded-[var(--radius-pill)] ${className}`}
    >
      {display}
    </span>
  );
}
