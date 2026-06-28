import { useTranslation } from 'react-i18next';
import type { MessageListItem } from '@/lib/api/chat';
import { REACTION_EMOJIS } from '@/lib/api/chat';
import type { ReactionEmoji } from '@/shared/types/domain';

/**
 * M4-7 — `<Reactions>` chip row rendered BELOW each bubble (CAP-15).
 *
 * Visual + interaction contract:
 *   - Each chip = emoji glyph + count suffix (when count ≥ 2).
 *   - Chips where `hasMine === true` carry an accent-soft background
 *     tint to signal the current user has applied that emoji.
 *   - The row is purely visual UNTIL a click handler is wired; the
 *     `onToggle` callback fires with the emoji so the caller can
 *     route through `useAddReaction` / `useRemoveReaction`.
 *   - All 6 emojis in `REACTION_EMOJIS` are always rendered IF a bucket
 *     exists for them; we do NOT show an "empty chip" for missing
 *     emojis (the picker trigger is the add-new affordance instead).
 *
 * The row renders nothing when the message has zero reactions
 * (`item.reactions` is undefined OR an empty array).
 */
interface ReactionsProps {
  reactions: MessageListItem['reactions'];
  /**
   * Click-to-toggle handler. Returns the resolved toggle direction so
   * callers can pass straight to `addReaction` / `removeReaction`.
   *   `add`    → user just clicked an emoji they hadn't reacted with
   *   `remove` → user just clicked an emoji they HAD reacted with
   */
  onToggle: (
    emoji: ReactionEmoji,
    action: 'add' | 'remove',
  ) => void;
}

export function Reactions({ reactions, onToggle }: ReactionsProps) {
  const { t } = useTranslation();

  if (!reactions || reactions.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-[var(--space-2xs)]"
      role="group"
      aria-label={t('chat.reaction.a11yGroup')}
    >
      {reactions.map((bucket) => {
        const isMine = bucket.hasMine;
        const ariaLabel = isMine
          ? t('chat.reaction.removeLabel', {
              emoji: bucket.emoji,
              count: bucket.count,
            })
          : t('chat.reaction.addLabel', {
              emoji: bucket.emoji,
              count: bucket.count,
            });
        return (
          <button
            key={bucket.emoji}
            type="button"
            onClick={() =>
              onToggle(bucket.emoji, isMine ? 'remove' : 'add')
            }
            aria-label={ariaLabel}
            aria-pressed={isMine}
            data-emoji={bucket.emoji}
            className={[
              'inline-flex items-center gap-[2px]',
              'px-[var(--space-2xs)] py-[2px]',
              'rounded-[var(--radius-pill)]',
              'text-[var(--font-size-caption)]',
              'border',
              'transition-[background-color,border-color] duration-[var(--transition-hover)]',
              isMine
                ? 'bg-[var(--color-accent-soft-bg)] border-[var(--color-accent-soft-ring)] font-[500]'
                : 'bg-[var(--color-surface-1)] border-[var(--color-hairline-default)] hover:bg-[var(--color-surface-2)]',
              'focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]',
            ].join(' ')}
          >
            <span aria-hidden="true">{bucket.emoji}</span>
            {bucket.count > 1 && (
              <span className="text-[var(--color-ink-muted)] tabular-nums">
                ×{bucket.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Re-export the closed 6-emoji whitelist so dependent components
 * (EmojiPicker.tsx + MessageItem.tsx) can iterate the same canonical
 * set without re-importing from chat.ts.
 */
export { REACTION_EMOJIS };
