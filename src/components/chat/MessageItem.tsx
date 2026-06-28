import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Bubble } from '@/components/ui/Bubble';
import { AttachmentImage } from './AttachmentImage';
import type { MessageListItem } from '@/lib/api/chat';

interface MessageItemProps {
  item: MessageListItem;
  /**
   * `true` when this message follows another by the same sender within a
   * short window (≤ 5 min) — controls bubble spacing / avatar / sender
   * name visibility (i.e. compact consecutive mode).
   */
  isConsecutive: boolean;
}

/**
 * Self-deleted placeholder body. Per F-MSG-07 sender-only soft delete:
 * `deleted_by_sender_at` hides the body *only* for the sender's view;
 * recipients continue to see the original content unchanged.
 */
function SelfDeletedBody({ placeholder }: { placeholder: string }) {
  return (
    <span className="italic text-[var(--color-ink-muted)] font-[var(--font-weight-meta,400)]">
      {placeholder}
    </span>
  );
}

export function MessageItem({ item, isConsecutive }: MessageItemProps) {
  const { t } = useTranslation();

  // Sender name shown on first message in a run from each sender (group/channels
  // mostly; also covers 1:1 where the avatar alone identifies the other person).
  const showSender = !item.isSelf && !isConsecutive;

  // F-MSG-07: only the sender sees the deleted placeholder
  const isSelfDeleted = item.deletedBySenderAt !== null && item.isSelf;

  return (
    <div
      className={`flex w-full gap-[var(--space-xs)] px-[var(--space-md)] py-[var(--space-2xs)] ${
        item.isSelf ? 'justify-end' : 'justify-start'
      }`}
      role="listitem"
      aria-label={`${item.senderName} ${new Date(item.createdAt).toLocaleTimeString(
        [],
        { hour: '2-digit', minute: '2-digit', hour12: false },
      )}`}
      data-message-id={item.id}
      data-message-kind={item.kind}
    >
      {!item.isSelf && (
        <Avatar
          size="sm"
          src={item.senderAvatarUrl}
          name={item.senderName}
        />
      )}

      <div
        className={`flex min-w-0 max-w-[72%] flex-col gap-[var(--space-2xs)] ${
          item.isSelf ? 'items-end' : 'items-start'
        }`}
      >
        {showSender && (
          <span className="text-[var(--font-size-micro)] font-[500] text-[var(--color-ink-muted)]">
            {item.senderName}
          </span>
        )}

        <Bubble
          kind={item.isSelf ? 'self' : 'friend'}
          isConsecutive={isConsecutive}
        >
          {isSelfDeleted ? (
            <SelfDeletedBody placeholder={t('messages.deleted')} />
          ) : item.kind === 'text' && item.body ? (
            <Bubble.Text>{item.body}</Bubble.Text>
          ) : item.kind === 'image' && item.attachment ? (
            <AttachmentImage
              storagePath={item.attachment.storagePath}
              alt={t('chat.imageAlt')}
              width={item.attachment.width ?? 320}
              height={item.attachment.height ?? 240}
            />
          ) : (
            // File typing comes in M5-7 (M3-3 placeholder = unsupported marker)
            item.kind === 'file' && (
              <span className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] italic">
                {t('messages.fileUnsupported')}
              </span>
            )
          )}

          {item.editedAt && !isSelfDeleted && (
            <span className="ml-[var(--space-xs)] text-[var(--font-size-caption)] text-[var(--color-ink-muted)]">
              ({t('chat.edited')})
            </span>
          )}
        </Bubble>
      </div>
    </div>
  );
}
