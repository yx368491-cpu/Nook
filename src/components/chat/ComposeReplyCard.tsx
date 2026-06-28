import { useTranslation } from 'react-i18next';
import type { ReplyPreview } from '@/stores/useChat';

/**
 * ComposeReplyCard — the floating reply preview that sits above the
 * composer's input row (DESIGN § 7.3).
 *
 * Visual: `surface-2` card, 12 px radius, with a 2 px accent rail on the
 * left edge as the "quote" affordance. Sender name is rendered above the
 * (single-line, truncated) body. A circular close icon on the right
 * calls `onCancel`.
 *
 * Used by:
 * - `<Composer>` when `useChat.replyingTo` is set
 *
 * Future wiring (M4-6): "hover message → 回复" actions will call
 * `useChat.setReplyingTo({ id, senderName, bodyPreview })`.
 */
interface ComposeReplyCardProps {
  preview: ReplyPreview;
  onCancel: () => void;
}

export function ComposeReplyCard({ preview, onCancel }: ComposeReplyCardProps) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        // surface ladder
        'bg-[var(--color-surface-2)]',
        // geometry
        'rounded-[var(--radius-lg)]',
        'border border-[var(--color-hairline-default)]',
        // size + spacing — flex row keeps the close button anchored
        'flex items-center gap-[var(--space-sm)]',
        'pl-[var(--space-sm)] pr-[var(--space-2xs)] py-[var(--space-2xs)]',
        // the explicit 2 px accent rail on the left edge (DESIGN § 7.3)
        'border-l-[2px] border-l-[var(--color-accent-default)]',
        // gutter between the card and the textarea row below
        'mb-[var(--space-xs)]',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[var(--font-size-micro)] font-[500] text-[var(--color-ink-muted)]">
          {t('composer.replyToLabel', { name: preview.senderName })}
        </div>
        <div className="truncate text-[var(--font-size-meta)] text-[var(--color-ink-default)]">
          {preview.bodyPreview}
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label={t('composer.replyCancel')}
        title={t('composer.replyCancel')}
        className={[
          'flex-shrink-0',
          'w-[28px] h-[28px] rounded-full',
          'flex items-center justify-center',
          'text-[var(--color-ink-muted)]',
          'hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-default)]',
          'transition-colors duration-[var(--transition-hover)]',
          'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]',
        ].join(' ')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
