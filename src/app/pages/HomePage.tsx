import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useUI } from '@/stores/useUI';
import { useConversationsQuery } from '@/hooks/useConversations';
import { useUserRealtime } from '@/hooks/useUserRealtime';

/**
 * HomePage — authenticated chat surface.
 *
 * Layout:
 *   [ Sidebar ]  [ ChatPanel | empty-state hint ]
 *
 * Sidebar renders 1:1 + group list (M3-2). When a conversation is
 * selected, ChatPanel takes over the center pane and renders the
 * virtualized message list (M3-3). M3-4 will replace the chat panel
 * footer with the floating composer island.
 */
export default function HomePage() {
  const { t } = useTranslation();
  const selectedId = useUI((s) => s.selectedConversationId);
  const { data: conversations } = useConversationsQuery();
  const selected = conversations?.find((c) => c.id === selectedId);

  // M3-5: subscribe user-global Realtime (conversation_members INSERT/UPDATE
  //   + own profile UPDATE). Single channel, mounted at app-level so it
  //   survives conversation-switch. Sidebar refresh logic is internal to
  //   the hook.
  useUserRealtime();

  return (
    <div className="flex min-h-screen bg-[var(--color-canvas-default)]">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-[var(--space-md)]">
            <p className="text-[var(--font-size-body)] text-[var(--color-ink-muted)]">
              {t('chat.emptyConversation')}
            </p>
          </div>
        ) : selected ? (
          <ChatPanel
            conversationId={selectedId}
            title={selected.title}
            avatarUrl={selected.avatarUrl}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-[var(--space-md)]">
            <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)]">
              {t('common.loading')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
