/**
 * Nook M6-6 · `<ConfirmModal>` — generic destructive-action modal.
 *
 * Owner-facing destructive actions (delete friend, future bulk-remove,
 * future revoke-token, future …) all share the same UX:
 *
 *   1. Modal opens with autofocus on a "phrase" text input.
 *   2. The submit button is DISABLED until the user's typed value
 *      matches the supplied `phrase` (case-insensitive, trim-aware).
 *   3. Submit only fires `onConfirm()` — never via Enter-without-match
 *      (the form's `onSubmit` validates state before invoking).
 *   4. Escape keypress fires `onCancel()` so the user can dismiss in
 *      panic.
 *   5. Backdrop click intentionally does NOT close — destructive modal
 *      UX (thinker recommendation: clicking the dim backdrop while
 *      mid-typing is the most common accidental-close vector).
 *
 * Render strategy:
 *   - `createPortal` to document.body so the modal overlays everything
 *     regardless of z-index parent stacking (ChatPanel sidebars, etc).
 *   - Pure-controlled `open` prop; component renders nothing when closed.
 *
 * Accessibility:
 *   - `role="dialog"` + `aria-modal="true"` so screen readers treat
 *     the panel as a modal dialog.
 *   - `aria-labelledby` + `aria-describedby` wire title + message text
 *     into the dialog tree.
 *   - `aria-invalid={true}` on the input after the user starts typing
 *     and the phrase is mismatched — defensive against soft-validation
 *     skip.
 *   - focus-visible: 2px var(--color-accent-soft-ring) on submit button
 *     per Nook-DESIGN-TOKENS.ts + Nook-CODING-STANDARDS.md.
 *
 * i18n: keys live under `confirmModal.*` block; the modal is reusable
 * across Owner-facing destructive surfaces (M6-5, M6-7 re-invite
 * revoke, …). The "phrase" is interpolated so callers can swap
 * "confirm" for any future required word.
 */

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode, FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export interface ConfirmModalProps {
  /** Visibility. Closed by parent via state. */
  open: boolean;
  /** Heading (required). */
  title: string;
  /**
   * Body. Can be plain string or ReactNode (rare mix with i18n links).
   * Wrapped in a `<div aria-describedby>` so screen reader users
   * get the message read aloud after the dialog opens.
   */
  message: ReactNode;
  /**
   * Optional destructive warning strip rendered above the input.
   * i18n `confirmModal.warning` (only used by DeleteFriendCard for
   * its specific M6-5 wording).
   */
  warning?: string;
  /**
   * Required phrase the user must type. Defaults to "confirm". Trim +
   * case-insensitive match.
   */
  phrase?: string;
  /** Submit button label (i18n at call site). */
  submitLabel: string;
  /** Cancel button label (i18n at call site). */
  cancelLabel: string;
  /** Cancel click OR Escape-keypress handler. */
  onCancel: () => void;
  /**
   * Submit handler — fires only when input matches `phrase`. May be
   * async (useMutation); `loading` should be wired to the parent
   * mutation state for the spinner.
   */
  onConfirm: () => void | Promise<void>;
  /** Spinner + disable state. Default: false. */
  loading?: boolean;
  /**
   * Test-id prefix so a single page can host multiple confirm modals
   * without id collision. Default: 'confirm-modal'.
   */
  testIdPrefix?: string;
}

export function ConfirmModal(props: ConfirmModalProps) {
  const {
    open,
    title,
    message,
    warning,
    phrase = 'confirm',
    submitLabel,
    cancelLabel,
    onCancel,
    onConfirm,
    loading = false,
    testIdPrefix = 'confirm-modal',
  } = props;

  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Stable title/message IDs per instance (multiple modals on one page)
  const titleId = `${testIdPrefix}-title-${useId()}`;
  const messageId = `${testIdPrefix}-message-${useId()}`;
  const inputId = `${testIdPrefix}-input-${useId()}`;
  const hintId = `${testIdPrefix}-hint-${useId()}`;

  // Reset state + autofocus on open transition.
  useEffect(() => {
    if (!open) {
      setInput('');
      return;
    }
    setInput('');
    // focus the input on next paint (post-mount + ref available)
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Escape keypress → onCancel (modal must be open).
  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  // Phrase match state — case-insensitive trim.
  const phraseMatches = useMemo(
    () => input.trim().toLowerCase() === phrase.trim().toLowerCase(),
    [input, phrase],
  );
  const showInvalid = input.length > 0 && !phraseMatches;
  const canSubmit = phraseMatches && !loading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onConfirm();
  };

  // Tab-trap: cycle focus between cancel/submit/input when modal open.
  const handlePanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusables = [inputRef.current, cancelBtnRef.current].filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-[rgba(0,0,0,0.40)] backdrop-blur-sm
        motion-safe:animate-[confirm-fade-in_var(--duration-fast)_ease-out]
      "
      role="presentation"
      data-testid={`${testIdPrefix}-backdrop`}
      onClick={(e) => {
        // Backdrop click does NOT close — destructive modal. Stop
        // the bubble so the panel does not see it either.
        e.stopPropagation();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={handlePanelKeyDown}
        className="
          flex flex-col gap-[var(--space-md)]
          max-w-[480px] w-[90vw]
          bg-[var(--color-surface-1)]
          border border-[var(--color-hairline-default)]
          rounded-[var(--radius-xl)]
          p-[var(--space-lg)]
          shadow-[var(--shadow-4)]
        "
        data-testid={testIdPrefix}
      >
        <h2
          id={titleId}
          className="
            text-[var(--font-size-h3)] font-[600]
            text-[var(--color-ink-default)]
          "
        >
          {title}
        </h2>

        <div
          id={messageId}
          className="
            text-[var(--font-size-body-md)]
            text-[var(--color-ink-muted)]
            leading-[var(--leading-chill)]
          "
        >
          {message}
        </div>

        {warning && (
          <p
            role="alert"
            data-testid={`${testIdPrefix}-warning`}
            className="
              px-[var(--space-md)] py-[var(--space-sm)]
              text-[var(--font-size-meta)]
              text-[var(--color-signal-error)]
              bg-[var(--color-signal-error-soft)]
              border border-[var(--color-signal-error)]
              rounded-[var(--radius-md)]
            "
          >
            {warning}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-[var(--space-sm)]"
        >
          <label
            htmlFor={inputId}
            className="
              text-[var(--font-size-meta)]
              text-[var(--color-ink-muted)]
            "
          >
            {t('confirmModal.confirmLabel', { phrase })}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('confirmModal.submitPlaceholder', { phrase })}
            disabled={loading}
            aria-invalid={showInvalid || undefined}
            aria-describedby={hintId}
            autoComplete="off"
            className="
              w-full h-[var(--size-button-md)] px-[var(--space-md)]
              bg-[var(--color-surface-2)]
              border border-[var(--color-hairline-default)]
              text-[var(--font-size-body-md)]
              text-[var(--color-ink-default)]
              rounded-[var(--radius-lg)]
              focus:outline-[2px] focus:outline-[var(--color-accent-soft-ring)]
              focus:outline-offset-[3px]
            "
            data-testid={`${testIdPrefix}-input`}
          />
          <p
            id={hintId}
            className="
              text-[var(--font-size-meta)]
              text-[var(--color-ink-muted)]
            "
          >
            {phraseMatches
              ? t('confirmModal.phraseMatches')
              : t('confirmModal.submitPlaceholder', { phrase })}
          </p>

          <div
            className="
              flex items-center justify-end gap-[var(--space-sm)]
              mt-[var(--space-2xs)]
            "
          >
            <Button
              ref={cancelBtnRef}
              intent="neutral"
              size="md"
              onClick={onCancel}
              disabled={loading}
              type="button"
              data-testid={`${testIdPrefix}-cancel`}
            >
              {cancelLabel}
            </Button>
            <Button
              intent="danger"
              size="md"
              type="submit"
              disabled={!canSubmit}
              loading={loading}
              data-testid={`${testIdPrefix}-submit`}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
