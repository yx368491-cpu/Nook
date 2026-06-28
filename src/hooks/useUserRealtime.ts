import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  subscribeUserEvents,
  type UserChannelHandlers,
} from '@/lib/realtime/conversationChannel';
import { useAuth } from '@/stores/useAuth';

/**
 * Hook — subscribe to user-global Realtime events.
 *
 * Mounted at the app-level layout (HomePage) so it stays alive
 * regardless of which conversation is active.
 *
 * Handlers:
 *   - onMemberChange → invalidate `['conversations']` so the sidebar
 *     refreshes when a friend signs up (1:1 auto-created via EF) or
 *     when the owner deletes a friend (left_at set, future M6-5)
 *   - onProfileUpdate (self only) → invalidate `['conversations']`
 *     so the sidebar user-card avatar + name reflect the change.
 *
 * Peer profile UPDATE on `profiles` requires fan-out filtering that
 * the user channel doesn't support cleanly; for M3-5 we rely on the
 * 30s `refetchInterval` poll on `useConversationsQuery` + the per-conv
 * realtime subscriber (which patches messages in place). Future
 * work (M4-8) can switch to fan-out or per-conv profile channels.
 */
export function useUserRealtime() {
  const qc = useQueryClient();
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  useEffect(() => {
    if (!userId) return;

    const handlers: UserChannelHandlers = {
      onMemberChange: () => {
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      },
      onProfileUpdate: () => {
        // Self profile changed → sidebar should refresh avatar / name.
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      },
    };

    const unsubscribe = subscribeUserEvents(userId, handlers);
    return unsubscribe;
  }, [userId, qc]);
}
