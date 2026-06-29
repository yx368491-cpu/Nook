/**
 * M5-7 — `<UploadProgressBar>` component.
 *
 * Renders an active upload's progress state as a thin lavender bar
 * with percent + filename label + cancel button. Used by `<Composer>`
 * to provide user feedback during the `uploadAttachment` XHR-direct
 * path happy case.
 *
 * Accessibility:
 *   - `role="progressbar"` + `aria-valuenow`/`aria-valuemin`/`aria-valuemax`/
 *     `aria-label` so screen readers announce "{filename}, {percent} percent".
 *   - Cancel button has `aria-label = t('chat.upload.cancelAria', { fileName })`
 *     so the screen-reader announcement distinguishes which upload the
 *     cancel action targets (Composer only allows one active at a time;
 *     still, the specificity helps).
 *   - Visual polite announced via `data-testid="attachment-upload-progress-bar"`.
 *
 * Visual layout:
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ 42% · 17MB-report.pdf                       [Cancel]      │
 *   │ ────────────────────────────── (lavender 4 px progress)   │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Cancelling calls `onCancel()`, which Composer wires to
 * `useFileUploadProgress.cancel()` — aborts the XHR + clears state.
 */

import { useTranslation } from 'react-i18next';
import type { FileUploadProgressState } from '@/hooks/useFileUploadProgress';

interface UploadProgressBarProps {
  state: FileUploadProgressState;
  /** Wired to `useFileUploadProgress.cancel()`. */
  onCancel: () => void;
}

export function UploadProgressBar({
  state,
  onCancel,
}: UploadProgressBarProps) {
  const { t } = useTranslation();
  const pct =
    state.total > 0
      ? Math.min(100, Math.round((state.loaded / state.total) * 100))
      : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('chat.upload.progressAria', {
        fileName: state.fileName,
        percent: pct,
      })}
      data-testid="attachment-upload-progress-bar"
      className={[
        'mb-[var(--space-xs)] flex flex-col gap-[var(--space-2xs)]',
        'rounded-[var(--radius-md)]',
        'border border-[var(--color-hairline-default)]',
        'bg-[var(--color-surface-1)]',
        'px-[var(--space-sm)] py-[var(--space-2xs)]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-[var(--space-sm)] min-w-0">
        <span
          className={[
            'min-w-0 flex-1 truncate',
            'text-[var(--font-size-meta)]',
            'text-[var(--color-ink-default)]',
          ].join(' ')}
          title={state.fileName}
        >
          {t('chat.upload.progress', {
            percent: pct,
            fileName: state.fileName,
          })}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('chat.upload.cancelAria', {
            fileName: state.fileName,
          })}
          title={t('common.cancel')}
          data-testid="attachment-upload-progress-cancel"
          className={[
            'flex-shrink-0',
            'rounded-[var(--radius-sm)]',
            'px-[var(--space-xs)] py-[var(--space-2xs)]',
            'text-[var(--font-size-meta)]',
            'text-[var(--color-ink-muted)]',
            'hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-default)]',
            'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]',
          ].join(' ')}
        >
          {t('common.cancel')}
        </button>
      </div>
      <div
        className={[
          'h-[4px] w-full overflow-hidden rounded-[var(--radius-pill)]',
          'bg-[var(--color-surface-3)]',
        ].join(' ')}
      >
        <div
          className="h-full bg-[var(--color-accent-default)] motion-safe:transition-[width] duration-[var(--duration-fast)] ease-out"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
