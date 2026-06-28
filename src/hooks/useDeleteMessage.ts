import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  deleteOwnMessage,
  type MessagesPage,
} from '@/lib/api/chat';
import { useAuth } from '@/stores/useAuth';

/**
 * M4-5 — sender-only soft-delete a non-system message within the 2-minute
 * window.
 *
 * Mirrors `useEditMessage` + `useRecallMessage`'s optimistic-UI shape so
 * the UX feels native to the conversation: the bubble flips to the
 * `<SelfDeletedBody placeholder={t('messages.deleted')} />` (M3-3's existing
 * `isSelfDeleted` branch) the moment the sender clicks. The body stays
 * intact for recipients — F-MSG-07 sender-only semantics.
 *
 * Optimistic update flow:
 *   1. onMutate:
 *      - cancel pending ['messages', userId, convId] queries
 *      - snapshot previous cache
 *      - patch in place: `deletedBySenderAt` → `<now>` (body untouched)
 *      - return snapshot for rollback
 *   2. onError: roll back to the snapshot (bubble reverts to original body
 *      + the in-flight mutation's error surfaces in the shared error strip)
 *   3. onSuccess: invalidate so the server's `deleted_by_sender_at` value
 *      converges (M3-5's Realtime UPDATE echo will re-merge quietly).
 *
 * The queryKey matches `useInfiniteMessages` so the cache is shared with
 * M3-3's list, M3-4's optimistic-pending insert, and M4-3 edit/recall patches.
 */
export function useDeleteMessage(conversationId: string | null) {
  const qc = useQueryClient();
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useMutation<
    { id: string; deletedAt: string },
    Error,
    { messageId: string },
    { previous: InfiniteData<MessagesPage> | undefined }
  >({
    mutationFn: ({ messageId }) => deleteOwnMessage({ messageId }),
    onMutate: async ({ messageId }) => {
      const queryKey = ['messages', userId, conversationId] as const;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<InfiniteData<MessagesPage>>(queryKey);

      if (previous) {
        const optimisticDeletedAt = new Date().toISOString();
        // Only `deletedBySenderAt` is patched — body / attachment / recalledAt
        // stay verbatim because the recipient view (and the row itself) is
        // genuinely unchanged. F-MSG-07 enforces sender-exclusive semantics.
        qc.setQueryData<InfiniteData<MessagesPage>>(queryKey, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === messageId
                ? { ...item, deletedBySenderAt: optimisticDeletedAt }
                : item,
            ),
          })),
        });
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback only — caller surfaces via error state.
      if (ctx?.previous) {
        qc.setQueryData(
          ['messages', userId, conversationId] as const,
          ctx.previous,
        );
      }
    },
    onSuccess: (_data, _vars) => {
      void qc.invalidateQueries({
        queryKey: ['messages', userId, conversationId] as const,
      });
    },
  });
}
