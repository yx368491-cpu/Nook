/**
 * M5-7 — `<AttachmentDropZone>` overlay component.
 *
 * Renders a richer drop-zone visual that REPLACES the M3-4 inline
 * dashed-border overlay that lived inside `<Composer>`. Hit area
 * is unchanged — the Composer still owns the drag handlers (its
 * outer `position: relative` div catches dragOver/dragLeave/drop);
 * this component is purely visual and renders as a sibling at the
 * bottom of the Composer's child tree.
 *
 * Why a separate component:
 *   - Concentrates the i18n keys (dropZone.title, dropZone.hint) so
 *     a future Quick-Capture (Cmd+Shift+V drop-from-clipboard) flow
 *     in v1.1+ can reuse `<AttachmentDropZone>` with the same visual.
 *   - Keeps `<Composer>` readable — the JSX narrowing is non-trivial
 *     and we'd otherwise have 30+ lines of icon + hint strings
 *     buried in Composer's return block.
 *   - Lets the test introspect the overlay in isolation
 *     (`data-testid="attachment-drop-zone-overlay"`).
 *
 * Visual layout:
 *
 *   ┌─ Composer outer relative div ─────────────────────────────┐
 *   │ ┌─ overlay absolute ────────────────────────────────────┐│
 *   │ │  ⬇ (36 px download icon, accent)                      ││
 *   │ │  「Drag to upload」                                    ││
 *   │ │  ≤ 50 MB · Images, PDFs, docs                         ││
 *   │ └────────────────────────────────────────────────────────┘│
 *   │   (existing replyCard, error, exif, outbox, form         │
 *   │    remain interactable — pointer-events-none on overlay)  │
 *   └───────────────────────────────────────────────────────────┘
 */

import { useTranslation } from 'react-i18next';

interface AttachmentDropZoneProps {
  /** When `true`, renders the overlay inside its parent. */
  isDragging: boolean;
}

export function AttachmentDropZone({ isDragging }: AttachmentDropZoneProps) {
  const { t } = useTranslation();
  if (!isDragging) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="attachment-drop-zone-overlay"
      className={[
        'pointer-events-none',
        'absolute inset-[var(--space-sm)]',
        'rounded-[var(--radius-xl)] border-2 border-dashed',
        'border-[var(--color-accent-soft-ring)]',
        'bg-[var(--color-accent-soft-bg)]',
        'flex flex-col items-center justify-center',
        'gap-[var(--space-2xs)]',
        'motion-safe:animate-[progress-fade-in_var(--duration-fast)_ease-out]',
      ].join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--color-accent-default)]"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p
        className={[
          'text-[var(--font-size-body)]',
          'font-medium',
          'text-[var(--color-ink-default)]',
        ].join(' ')}
        data-testid="attachment-drop-zone-title"
      >
        {t('chat.dropZone.title')}
      </p>
      <p
        className={[
          'text-[var(--font-size-meta)]',
          'text-[var(--color-ink-muted)]',
        ].join(' ')}
        data-testid="attachment-drop-zone-hint"
      >
        {t('chat.dropZone.hint')}
      </p>
    </div>
  );
}
