import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  listMessages,
  markConversationRead,
  type MessageListItem,
  type MessagesPage,
} from '@/lib/api/chat';
import { useAuth } from '@/stores/useAuth';

const MSGS_STALE_TIME = 0; // chat is always fresh
const MSGS_GC_TIME = 5 * 60_000; // 5 min garbage collection on unmount

/**
 * Cursor-paginated message history for a single conversation.
 *
 * - infiniteQuery keys on (userId, conversationId) so switching rooms
 *   resets the cache
 * - `initialPageParam: null` so the first fetch returns the latest page
 * - `getNextPageParam` returns the API-provided cursor; null ends pagination
 * - `staleTime: 0` so refetchOnMount/Window-focus pulls fresh rows
 * - consumers are responsible for: (a) dedupe by `id` across pages, and
 *   (b) ASC sort for display (the hook returns DESC from the API)
 */
export function useInfiniteMessages(conversationId: string | null) {
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useInfiniteQuery<
    MessagesPage,
    Error,
    InfiniteData<MessagesPage>,
    readonly ['messages', string | null, string | null],
    string | null
  >({
    queryKey: ['messages', userId, conversationId] as const,
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      if (!userId || !conversationId) {
        return Promise.resolve({ items: [], nextCursor: null });
      }
      return listMessages({
        conversationId,
        currentUserId: userId,
        beforeCursor: pageParam,
      });
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(userId && conversationId),
    staleTime: MSGS_STALE_TIME,
    gcTime: MSGS_GC_TIME,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Bumps `conversation_members.last_read_at` to "now" for the current user
 * in the given conversation (CAP-21b / `fn_mark_conversation_read` RPC).
 *
 * On success, invalidates the sidebar conversation query so unread badges
 * clear without a hard reload.
 */
export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (conversationId) => markConversationRead(conversationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export type { MessageListItem, MessagesPage };
