import { useEffect } from 'react';
import { subscribePresenceEvents } from '@/lib/realtime/conversationChannel';
import { usePresence } from '@/stores/usePresence';
import { useAuth } from '@/stores/useAuth';

/**
 * ChatPanel-side typing receiver (M4-1).
 *
 * Mounts the synchronous counterpart to `useTypingBroadcast`.
 * Subscribes to the shared `presence:<conversationId>` channel and
 * pushes the filtered typing user-ids (self excluded, online=true,
 * typing=true) into the Zustand `usePresence` store.
 *
 * Lifecycle:
 *  - subscribe on mount (or conversationId change)
 *  - on each presence sync, recompute the typing users and write
 *    them to the store keyed by conversationId
 *  - on unmount / conversationId change, clear the typingUsers
 *    slice so the next room starts fresh
 *
 * Channel dedupe: supabase-js dedupes by channel name, so the same
 * channel is shared with `useTypingBroadcast` (which calls `.track()`
 * on the matching `presence:<conversationId>` instance).
 */
export interface UseTypingReceiversArgs {
  conversationId: string;
}

export function useTypingReceivers({
  conversationId,
}: UseTypingReceiversArgs): void {
  const setTypingUsers = usePresence((s) => s.setTypingUsers);
  const selfUserId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribePresenceEvents(conversationId, {
      onSync: (peers) => {
        const typingAll = peers.filter(
          (p) => p.typing && p.online && Boolean(p.user_id),
        );
        const typingExcludingSelf = selfUserId
          ? typingAll.filter((p) => p.user_id !== selfUserId)
          : typingAll;
        setTypingUsers(
          conversationId,
          typingExcludingSelf.map((p) => p.user_id),
        );
      },
    });
    return () => {
      unsub();
      // Clear typingUsers for this room on unmount / conv switch.
      setTypingUsers(conversationId, []);
    };
  }, [conversationId, selfUserId, setTypingUsers]);
}
