import { useTranslation } from 'react-i18next';
import { useAuth } from '@/stores/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { UnreadBadge } from './UnreadBadge';
import type { ConversationListItem } from '@/lib/api/chat';

interface ConversationListItemRowProps {
  item: ConversationListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * Format `iso` as a compact timestamp:
 *   - today  → HH:MM (24h)
 *   - <  7d  → weekday short ("Mon", "周一", …)
 *   - older  → M/D
 *
 * Uses Intl.DateTimeFormat (browser locale) so the format naturally
 * aligns with the active i18n language.
 */
function formatLastActivity(iso: string, now: number = Date.now()): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diff = now - ts;
  const dayMs = 86_400_000;

  if (diff < dayMs) {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  if (diff < 7 * dayMs) {
    return new Date(ts).toLocaleDateString([], { weekday: 'short' });
  }
  return new Date(ts).toLocaleDateString([], {
    month: 'numeric',
    day: 'numeric',
  });
}

/**
 * Build the one-line preview under the conversation title.
 * - text  → localized body
 * - image → "[icon] <Image>"
 * - file  → "[icon] <File>"
 * Sender is the current user → prepend a short "Me:" / "我:" prefix.
 */
function previewText(
  t: (key: string) => string,
  lastMessage: ConversationListItem['lastMessage'],
  isSelf: boolean,
): string {
  if (!lastMessage) return t('chat.noMessages');
  const prefix = isSelf ? t('sidebar.previewSelf') : '';
  switch (lastMessage.kind) {
    case 'text':
      return `${prefix}${lastMessage.body ?? ''}`;
    case 'image':
      return `${prefix}· ${t('sidebar.previewImage')}`;
    case 'file':
      return `${prefix}· ${t('sidebar.previewFile')}`;
    // `MessageKind` includes `'system'` (server-emitted notices per
    // migration 0011 CHECK branch B). System rows have no user-friendly
    // preview, so we render just the self-prefix (or nothing for others).
    case 'system':
    default:
      return prefix;
  }
}

export function ConversationListItemRow({
  item,
  selected,
  onSelect,
}: ConversationListItemRowProps) {
  const { t } = useTranslation();
  const selfUserId = useAuth((s) => s.profile?.id ?? s.session?.user.id ?? null);

  const ts = formatLastActivity(item.lastActivityAt);
  const preview = previewText(
    t,
    item.lastMessage,
    item.lastMessage?.senderId === selfUserId,
  );

  // 1:1 avatar → other participant (already resolved in api/chat.transform)
  // group avatar → conversation.avatar_url; if absent, show a "#" hint
  // and fall back to a generated-letter avatar.
  const initialsForGroup =
    item.kind === 'group'
      ? (item.title?.[0] ?? '#')
      : undefined;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={selected ? 'true' : undefined}
      className={`w-full flex items-center gap-[var(--space-md)] px-[var(--space-md)] py-[var(--space-sm)] text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)] ${
        selected
          ? 'bg-[var(--color-accent-soft-bg)] border-l-[3px] border-[var(--color-accent-default)]'
          : 'border-l-[3px] border-transparent'
      }`}
    >
      {/* Avatar */}
      <Avatar
        size="md"
        src={item.avatarUrl}
        name={item.title}
        initials={initialsForGroup}
      />

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-[var(--space-sm)]">
          <span className="font-[500] text-[var(--font-size-body)] text-[var(--color-ink-default)] truncate">
            {item.title}
          </span>
          <span className="text-[var(--font-size-micro)] text-[var(--color-ink-muted)] flex-shrink-0 tabular-nums">
            {ts}
          </span>
        </div>
        <div className="flex items-center justify-between gap-[var(--space-sm)] mt-[2px]">
          <span className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] truncate">
            {preview}
          </span>
          {item.unreadCount > 0 && (
            <UnreadBadge
              count={item.unreadCount}
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>
    </button>
  );
}
