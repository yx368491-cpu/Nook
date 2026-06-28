import { useTranslation } from 'react-i18next';

/**
 * M4-6 — `<ReplyCard>` chip rendered ABOVE the bubble when the message
 * references a prior message via `reply_to_id` (SPEC § 2.3 F-MSG-04).
 *
 * Visual parity with `<ComposeReplyCard>`:
 *   - `surface-2` background
 *   - `radius-lg` corners
 *   - 2 px accent rail on the LEFT edge (the "quote" affordance,
 *     DESIGN § 7.3)
 *   - sender name (caption font, ink-muted) ABOVE truncated body preview
 *
 * Adaptive content:
 *   - `replyTo.recalledAt !== null` → muted "(已撤回)" placeholder
 *     (translated via `chat.replyCard.recalled`)
 *   - `replyTo.kind === 'image'` → translated `chat.replyCard.image`
 *     placeholder, no body preview (image-content is content-addressable,
 *     clients can't read it from the body string)
 *   - `replyTo.kind === 'file'` → translated `chat.replyCard.file`
 *   - `replyTo.kind === 'text'` → 60-char clipped body preview
 *
 * Note: sender-only soft-deleted parents (`deleted_by_sender_at`)
 * are intentionally NOT muted here — the recipient's view of the
 * conversation is unaffected by F-MSG-07. Showing the body verbatim
 * is the correct UX even though the sender sees a deleted placeholder
 * of their own.
 */
interface ReplyCardProps {
  preview: NonNullable<
    import('@/lib/api/chat').MessageListItem['replyTo']
  >;
  /** Width matches parent bubble max-width (default 100% for inline use). */
  maxWidth?: string;
}

export function ReplyCard({ preview, maxWidth }: ReplyCardProps) {
  const { t } = useTranslation();

  let bodyText: string;
  if (preview.recalledAt !== null) {
    bodyText = t('chat.replyCard.recalled');
  } else if (preview.kind === 'image') {
    bodyText = t('chat.replyCard.image');
  } else if (preview.kind === 'file') {
    bodyText = t('chat.replyCard.file');
  } else {
    bodyText = clipPreview(preview.body);
  }

  const isMuted = preview.recalledAt !== null;

  return (
    <div
      role="note"
      aria-label={t('chat.replyTo', { name: preview.senderName })}
      data-reply-to-id={preview.id}
      className={[
        // surface ladder — surface-2 matches ComposeReplyCard
        'bg-[var(--color-surface-2)]',
        'border border-[var(--color-hairline-default)]',
        // radius + spacing
        'rounded-[var(--radius-lg)]',
        'px-[var(--space-sm)] py-[var(--space-2xs)]',
        'flex flex-col gap-[2px]',
        // the explicit 2 px accent rail on the left edge (DESIGN § 7.3)
        'border-l-[2px] border-l-[var(--color-accent-default)]',
        // width — optional `maxWidth` (parent passes a const to match
        // bubble's max-w-[72%]); default to 100% so the chip occupies the
        // bubble column gracefully.
        'w-full',
      ].join(' ')}
      style={maxWidth ? { maxWidth } : undefined}
    >
      <div
        className={[
          'text-[var(--font-size-micro)] font-[500]',
          // muted accent when target is recalled (graceful degradation)
          isMuted
            ? 'text-[var(--color-ink-subtle)] italic'
            : 'text-[var(--color-ink-muted)]',
        ].join(' ')}
      >
        {t('chat.replyTo', { name: preview.senderName })}
      </div>
      <div
        className={[
          'truncate text-[var(--font-size-meta)] leading-tight',
          isMuted ? 'italic text-[var(--color-ink-subtle)]' : 'text-[var(--color-ink-default)]',
        ].join(' ')}
        title={preview.body ?? undefined}
      >
        {bodyText}
      </div>
    </div>
  );
}

/** 60-char body clip — matches Composer / Sidebar previewText helper. */
function clipPreview(body: string | null): string {
  if (body === null) return '';
  const trimmed = body.replace(/\s+/g, ' ').trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 59)}…` : trimmed;
}
