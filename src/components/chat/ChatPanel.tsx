import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { TypingIndicator } from './TypingIndicator';
import { useConversationPresence } from '@/hooks/useConversationPresence';
import { useMarkConversationRead } from '@/hooks/useMessages';
import { usePresence } from '@/stores/usePresence';

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
 * - Header: Avatar + title + 6 px lavender pulse dot when ANY peer is
 *   online in this conv (F-ST-01 / AC.11). For 1:1 the peer is one
 *   specific friend; for groups the dot signals "someone is here".
 *   The dot's semantics are intentionally a single boolean rather
 *   than per-peer dot: Nook is a small-group product and a single
 *   pulse carries enough signal v1.0 (per-member dot matrix is a
 *   v1.1+ polish opportunity).
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

  /**
   * M4-1 + M4-8 presence receiver: subscribes to the shared
   * `presence:<conversationId>` channel and writes BOTH
   * online + typing peer sets (self-excluded) to the Zustand store.
   *
   * - TypingIndicator reads `typingUsers[conversationId]` for the 3-dot
   *   ambient animation (F-MSG-08 / AC.05).
   * - The header Avatar below reads `onlineUsers[conversationId]` for
   *   the 6 px lavender pulse dot (F-ST-01 / AC.11).
   */
  useConversationPresence({ conversationId });

  /**
   * F-ST-01 / AC.11 — Ambient presense dot / pulse.
   *
   * `onlineUsers[convId]` is a Set of peer user-ids (self excluded,
   * per the hook's self-actor gate). For v1.0 M4-8 we render a single
   * dot on the header avatar regardless of conv.kind:
   *   - 1:1 conv  → dot = other peer's online state
   *   - group conv → dot = "any peer online in this group" (gives the
   *     chat a "live" feel without per-avatar overhead)
   *
   * `size > 0` is the derived boolean passed to Avatar.status.
   * clearConv leaves a hole on unmount, so this naturally returns
   * `undefined` → `?? 0` → `false` after a conversation switch.
   *
   * a11y: Avatar natively encodes `status` into its aria-label
   * (`${name} 的头像，在线` per Avatar.spec § 7), so screen readers
   * already announce the state — no extra <span role="status"> needed.
   */
  const onlineSetSize = usePresence(
    (s) => s.onlineUsers.get(conversationId)?.size ?? 0,
  );
  const isAnyPeerOnline = onlineSetSize > 0;

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
          status={isAnyPeerOnline ? 'online' : undefined}
          pulse={isAnyPeerOnline}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-[600] text-[var(--font-size-body)] text-[var(--color-ink-default)]">
            {title ?? t('chat.emptyConversation')}
          </h2>
        </div>
        {/* M4-1 / M4-2 — ambient 3-dot typing indicator. Returns null
            when no one is typing, so the header is layout-stable. */}
        <TypingIndicator conversationId={conversationId} />
      </header>

      <MessageList conversationId={conversationId} />

      {/* M3-4 Composer floating island (DESIGN § 7 form B). Handles its own
          padding-up so the outer footer remains borderless. Reply
          preview, attach buttons, send, and draft retention are all
          internal to <Composer />. */}
      <footer className="border-t border-[var(--color-hairline-default)] bg-[var(--color-canvas-default)]">
        <Composer conversationId={conversationId} />
      </footer>
    </section>
  );
}
