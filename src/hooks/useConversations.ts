import { useQuery } from '@tanstack/react-query';
import { listConversations, type ConversationListItem } from '@/lib/api/chat';
import { useAuth } from '@/stores/useAuth';

/**
 * Sidebar conversations query.
 *
 * - 30s staleTime: avoids re-fetching on every chat-room navigation.
 * - refetchOnWindowFocus: picks up cross-tab message inserts when the user
 *   returns (real-time per-conv subscription lands in M3-5 / M4).
 * - `enabled` gates on having a current user id; renders nothing
 *   for unauthenticated pages (e.g. login redirect).
 *
 * The hook returns react-query's standard shape; UI components only need
 * `{ data, isLoading, error, refetch }`.
 */
export function useConversationsQuery() {
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useQuery<ConversationListItem[]>({
    queryKey: ['conversations', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([] as ConversationListItem[]);
      return listConversations(userId);
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
