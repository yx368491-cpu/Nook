/**
 * Nook M7-7 · `<Skeleton>` — reusable shimmer loading placeholder.
 *
 * Renders a gradient-shimmer animated block. Replaces inline
 * `animate-pulse` divs and static loading text across the app.
 *
 * Usage:
 *   <Skeleton width={32} height={32} variant="circle" />
 *   <Skeleton width={120} height={14} variant="text" />
 *   <Skeleton className="flex-1 h-[48px]" />
 *
 * Accessibility:
 *   - `aria-hidden="true"` so screen readers skip the placeholder
 *     (the parent should use `role="status"` / `aria-busy` for
 *     loading announcements).
 *   - `prefers-reduced-motion` reduces shimmer to static color.
 */

import type { HTMLAttributes } from 'react';

type SkeletonVariant = 'text' | 'circle' | 'rect';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Width in px. Default: 100%. */
  width?: number | string;
  /** Height in px. Default: 20px. */
  height?: number | string;
  /** Shape variant. Default: 'rect'. */
  variant?: SkeletonVariant;
}

const variantRadiusClasses: Record<SkeletonVariant, string> = {
  text: 'rounded-[var(--radius-sm)]',
  circle: 'rounded-[var(--radius-circle)]',
  rect: 'rounded-[var(--radius-md)]',
};

export function Skeleton({
  width,
  height = 20,
  variant = 'rect',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'bg-[var(--color-surface-2)]',
        'motion-safe:animate-[shimmer_1.5s_ease-in-out_infinite]',
        'motion-safe:bg-[length:200%_100%]',
        'motion-safe:bg-gradient-to-r',
        'motion-safe:from-[var(--color-surface-2)]',
        'motion-safe:via-[var(--color-surface-3)]',
        'motion-safe:to-[var(--color-surface-2)]',
        variantRadiusClasses[variant],
        className,
      ].join(' ')}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}
