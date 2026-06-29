import { useTranslation } from 'react-i18next';
import { usePresence } from '@/stores/usePresence';
import { useConversationsQuery } from '@/hooks/useConversations';

/**
 * TypingIndicator (M4-2 ambient 3-dot animation + i18n copy).
 *
 * Reads typing user-ids from Zustand (populated by useConversationPresence)
 * and resolves display-names from the cached `useConversationsQuery()`
 * sidebar data — keeps the realtime presence payload minimal.
 *
 * Copy variants:
 *  - 1 user:   「{name} 正在输入…」/"{{name}} is typing…"
 *  - 2 users:  「{a} 和 {b} 正在输入…」/"{{a}} and {{b}} are typing…"
 *  - 3+ users: 「多位朋友正在输入…」/"Several friends are typing…"
 *
 * Animation: three 6 px dots using the `--duration-ambient` token
 * (1200 ms loop, ease-in-out, opacity 0.3 → 1.0). Tailwind's
 * `motion-safe:` prefix skips the animation when the user prefers
 * reduced motion.
 */

const STAGGER_MS = 150;
const DOT_COUNT = 3;

export interface TypingIndicatorProps {
  conversationId: string;
}

export function TypingIndicator({
  conversationId,
}: TypingIndicatorProps): React.ReactNode {
  const { t } = useTranslation();
  const typingUserIds =
    usePresence((s) => s.typingUsers.get(conversationId) ?? []) ?? [];
  const convs = useConversationsQuery();

  if (typingUserIds.length === 0) return null;

  // Build a userId → displayName lookup from the sidebar query cache.
  // All friends / the Owner are joined in `members[]` so any peer
  // showing up in the typing list will resolve here; for safety we
  // also keep a localized fallback (`chat.typingAnonymous`).
  const conversation = convs.data?.find((c) => c.id === conversationId);
  const fallbackName = t('chat.typingAnonymous');
  const idToName = new Map<string, string>();
  for (const m of conversation?.members ?? []) {
    if (m.displayName) idToName.set(m.userId, m.displayName);
  }
  const names = typingUserIds.map(
    (id) => idToName.get(id) ?? fallbackName,
  );

  const label =
    typingUserIds.length === 1
      ? t('chat.isTyping', { name: names[0] })
      : typingUserIds.length === 2
        ? t('chat.typingTwo', { a: names[0], b: names[1] })
        : t('chat.typingMany');

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      className="flex shrink-0 items-center gap-[var(--space-2xs)] text-[var(--font-size-meta)] text-[var(--color-ink-muted)]"
    >
      <span aria-hidden="true" className="flex items-center gap-[3px]">
        {Array.from({ length: DOT_COUNT }).map((_, i) => (
          <span
            key={i}
            className="inline-block h-[6px] w-[6px] rounded-[var(--radius-circle)] bg-[var(--color-chat-typing-indicator)] motion-safe:animate-[typing-pulse_var(--duration-ambient)_ease-in-out_infinite]"
            style={{ animationDelay: `${i * STAGGER_MS}ms` }}
          />
        ))}
      </span>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
