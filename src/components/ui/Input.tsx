import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';

export type InputVariant = 'form' | 'search' | 'composer' | 'password';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  sendAffordance?: boolean;
  error?: string | null;
  hint?: string | null;
  asChild?: boolean;
}

const variantStyles: Record<InputVariant, string> = {
  form: 'bg-[var(--color-canvas-default)] border border-[var(--color-hairline-default)] focus:bg-[var(--color-surface-1)] focus:border-[var(--color-hairline-strong)]',
  search: 'bg-[var(--color-canvas-default)] border border-[var(--color-hairline-default)] focus:bg-[var(--color-surface-1)] focus:border-[var(--color-hairline-strong)]',
  composer: 'bg-[var(--color-surface-2)] border border-[var(--color-hairline-default)] focus:border-[var(--color-accent-soft-ring)] shadow-[var(--shadow-2)]',
  password: 'bg-[var(--color-canvas-default)] border border-[var(--color-hairline-default)] focus:bg-[var(--color-surface-1)] focus:border-[var(--color-hairline-strong)]',
};

const sizeStyles: Record<InputVariant, Record<InputSize, string>> = {
  form: {
    sm: 'h-[var(--size-input-sm)] px-[var(--space-sm)]',
    md: 'h-[var(--size-input-md)] px-[var(--space-md)]',
    lg: 'h-[var(--size-input-lg)] px-[var(--space-lg)]',
  },
  search: {
    sm: 'h-[var(--size-input-sm)] px-[var(--space-sm)]',
    md: 'h-[var(--size-input-md)] px-[var(--space-md)]',
    lg: 'h-[var(--size-input-lg)] px-[var(--space-lg)]',
  },
  composer: {
    sm: 'min-h-[44px] max-h-[144px] px-[var(--space-sm)]',
    md: 'min-h-[44px] max-h-[144px] px-[var(--space-md)]',
    lg: 'min-h-[44px] max-h-[144px] px-[var(--space-lg)]',
  },
  password: {
    sm: 'h-[var(--size-input-sm)] px-[var(--space-sm)]',
    md: 'h-[var(--size-input-md)] px-[var(--space-md)]',
    lg: 'h-[var(--size-input-lg)] px-[var(--space-lg)]',
  },
};

const radiusStyles: Record<InputVariant, string> = {
  form: 'rounded-[var(--radius-md)]',
  search: 'rounded-[var(--radius-md)]',
  composer: 'rounded-[var(--radius-xl)]',
  password: 'rounded-[var(--radius-md)]',
};

type InputElement = HTMLInputElement | HTMLTextAreaElement;

export const Input = forwardRef<InputElement, InputProps>(
  ({
    variant = 'form',
    size = 'md',
    leadingIcon,
    trailingIcon,
    error,
    hint,
    disabled,
    className = '',
    ...props
  }, ref) => {
    const isComposer = variant === 'composer';
    const inputClasses = [
      'w-full outline-none',
      'text-[var(--font-size-body)] text-[var(--color-ink-default)]',
      'placeholder:text-[var(--color-ink-subtle)]',
      'transition-[background-color,border-color] duration-[var(--transition-hover)]',
      'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[3px]',
      'disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-ink-subtle)] disabled:opacity-50',
      error ? '!border-[var(--color-signal-error)]' : '',
      variantStyles[variant],
      sizeStyles[variant][size],
      radiusStyles[variant],
      className,
    ].join(' ');

    const inputProps = {
      ref,
      className: inputClasses,
      disabled,
      'aria-invalid': error ? true : undefined as boolean | undefined,
      ...props,
    };

    const wrapperClasses = [
      'relative flex items-center gap-[var(--space-xs)]',
    ].join(' ');

    if (isComposer) {
      return (
        <div className={wrapperClasses}>
          {leadingIcon && <span className="flex-shrink-0 text-[var(--color-ink-muted)]">{leadingIcon}</span>}
          <textarea
            {...(inputProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            rows={1}
            className={`${inputClasses} resize-none py-[var(--space-sm)] leading-[var(--leading-chill)] text-[var(--font-size-body-lg)]`}
          />
          {trailingIcon && <span className="flex-shrink-0">{trailingIcon}</span>}
        </div>
      );
    }

    return (
      <div className={wrapperClasses}>
        {leadingIcon && <span className="absolute left-[var(--space-sm)] text-[var(--color-ink-muted)]">{leadingIcon}</span>}
        <input
          {...(inputProps as InputHTMLAttributes<HTMLInputElement>)}
          className={`${inputClasses} ${leadingIcon ? 'pl-[calc(var(--space-sm)*2+16px)]' : ''} ${trailingIcon ? 'pr-[calc(var(--space-sm)*2+16px)]' : ''}`}
          type={variant === 'password' ? 'password' : variant === 'search' ? 'search' : 'text'}
        />
        {trailingIcon && <span className="absolute right-[var(--space-sm)]">{trailingIcon}</span>}
        {error && (
          <p className="mt-[var(--space-2xs)] text-[var(--font-size-caption)] text-[var(--color-signal-error)]">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-[var(--space-2xs)] text-[var(--font-size-caption)] text-[var(--color-ink-muted)]">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Nook.Input';
