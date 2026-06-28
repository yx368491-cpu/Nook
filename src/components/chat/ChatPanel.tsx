import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { MessageList } from './MessageList';
import { useMarkConversationRead } from '@/hooks/useMessages';

interface ChatPanelProps {
  conversationId: string;
  /** Header label (conversation title) — comes from sidebar query selection. */
  title?: string;
  /** Header avatar URL — comes from sidebar query selection. */
  avatarUrl?: string | null;
}

/**
 * ChatPanel — orchestrates one conversation view.
 *
 * - Header: minimal avatar + title. M3-4 will replace with the floating
 *   composer island + a richer action bar (F-CONV-04 / M4-8 ambient
 *   online status).
 * - Body: `MessageList` (virtualized, paginated, day separators).
 * - Footer: minimal composer placeholder until M3-4 lands.
 *
 * Side-effect on conversationId change: bumps `last_read_at` so the
 * Sidebar's unread badges clear (CAP-21b). The mutation invalidates
 * the `['conversations']` query key on success.
 */
export function ChatPanel({
  conversationId,
  title,
  avatarUrl,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const markRead = useMarkConversationRead();

  useEffect(() => {
    void markRead.mutate(conversationId);
  }, [conversationId, markRead]);

  return (
    <section
      className="flex h-full min-w-0 flex-col"
      aria-label={title ?? t('app.name')}
    >
      <header className="flex items-center gap-[var(--space-md)] border-b border-[var(--color-hairline-default)] bg-[var(--color-canvas-soft)] px-[var(--space-md)] py-[var(--space-sm)]">
        <Avatar
          size="md"
          src={avatarUrl ?? null}
          name={title ?? '?'}
        />
        <div className="min-w-0">
          <h2 className="truncate font-[600] text-[var(--font-size-body)] text-[var(--color-ink-default)]">
            {title ?? t('chat.emptyConversation')}
          </h2>
        </div>
      </header>

      <MessageList conversationId={conversationId} />

      <footer className="border-t border-[var(--color-hairline-default)] bg-[var(--color-canvas-soft)] px-[var(--space-md)] py-[var(--space-sm)] text-center text-[var(--font-size-meta)] text-[var(--color-ink-muted)]">
        {t('messages.composerPlaceholder')}
      </footer>
    </section>
  );
}
