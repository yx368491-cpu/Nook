import { forwardRef, cloneElement, isValidElement, useRef, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonIntent = 'accent' | 'neutral' | 'danger';
export type ButtonShape = 'rect' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  intent?: ButtonIntent;
  shape?: ButtonShape;
  size?: ButtonSize;
  iconOnly?: boolean;
  children: ReactNode;
  loading?: boolean;
  asChild?: boolean;
}

const intentStyles: Record<ButtonIntent, Record<ButtonShape, string>> = {
  accent: {
    rect: 'bg-[var(--color-accent-default)] text-[var(--color-accent-on)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-press)] active:scale-[0.97]',
    icon: 'bg-[var(--color-accent-soft-bg)] text-[var(--color-accent-default)] border border-[var(--color-accent-soft-ring)]',
  },
  neutral: {
    rect: 'bg-transparent text-[var(--color-ink-default)] border border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface-1)]',
    icon: 'bg-transparent text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-1)]',
  },
  danger: {
    rect: 'bg-transparent text-[var(--color-signal-error)] border border-[var(--color-hairline-strong)] hover:bg-[var(--color-signal-error-soft)]',
    icon: 'bg-transparent text-[var(--color-signal-error)] hover:bg-[var(--color-signal-error-soft)]',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-[var(--size-button-sm)] px-[var(--space-sm)]',
  md: 'h-[var(--size-button-md)] px-[var(--space-md)]',
  lg: 'h-[var(--size-button-lg)] px-[var(--space-lg)]',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-[var(--size-button-sm)] w-[var(--size-button-sm)]',
  md: 'h-[var(--size-button-md)] w-[var(--size-button-md)]',
  lg: 'h-[var(--size-button-lg)] w-[var(--size-button-lg)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    intent = 'accent',
    shape = 'rect',
    size = 'md',
    iconOnly = false,
    children,
    loading = false,
    asChild = false,
    disabled,
    className = '',
    ...props
  }, ref) => {
    const resolvedShape = iconOnly ? 'icon' : shape;
    const isDisabled = disabled || loading;

    // Spec §7 — iconOnly MUST have aria-label. Enforce at runtime so
    // screen-reader users never get an unlabelled icon button. The
    // console.error fires once per mount (ref gate) to avoid log spam
    // on re-renders.
    const ariaEnforceRef = useRef(false);
    useEffect(() => {
      if (iconOnly && !props['aria-label']) {
        if (!ariaEnforceRef.current) {
          console.error(
            '[Nook.Button] iconOnly=true requires an aria-label prop for accessibility (spec §7)',
          );
          ariaEnforceRef.current = true;
        }
      }
    }, [iconOnly, props['aria-label']]);

    const baseClasses = [
      'inline-flex items-center justify-center',
      'rounded-[var(--radius-lg)]',
      'font-[var(--font-weight-medium)] text-[var(--font-size-body)] leading-[1] tracking-[var(--tracking-button)]',
      'transition-[background-color,transform,opacity] duration-[var(--transition-hover)]',
      'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[3px]',
      'disabled:opacity-[var(--opacity-disabled)] disabled:cursor-not-allowed',
      'select-none',
      resolvedShape === 'icon' ? iconSizeStyles[size] : sizeStyles[size],
      intentStyles[intent][resolvedShape],
      className,
    ].join(' ');

    if (asChild && isValidElement(children)) {
      const childProps = children.props as Record<string, unknown>;
      const mergedClassName = `${baseClasses} ${childProps.className ?? ''}`;
      return cloneElement(children, {
        className: mergedClassName,
        ...props,
        ref,
      });
    }

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : children}
      </button>
    );
  },
);

Button.displayName = 'Nook.Button';
