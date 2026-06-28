import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  recallMessage,
  RECALLED_BODY_SENTINEL,
  type MessagesPage,
} from '@/lib/api/chat';
import { useAuth } from '@/stores/useAuth';

/**
 * M4-4 \u2014 recall a non-system message within the 2-minute window.
 *
 * Mirrors `useEditMessage`'s optimistic-UI shape so the UX feels
 * native to the conversation: the bubble's body instantly flips to the
 * `__recalled__` sentinel + `recalledAt` is stamped, then the Realtime
 * UPDATE echo confirms (M3-5's `onMessageUpdate` quietly re-merges the
 * server version via `patchById`).
 *
 * Optimistic update flow:
 *   1. onMutate:
 *      - cancel pending ['messages', userId, convId] queries
 *      - snapshot previous cache
 *      - patch in place: `body` \u2192 `__recalled__` + `recalledAt` \u2192 `<now>`
 *      - return snapshot for rollback
 *   2. onError: roll back to the snapshot (MessageItem \(\u2192 RecalledBody\))
 *   3. onSuccess: invalidate so the server value converges
 *
 * The queryKey matches `useInfiniteMessages` so the cache is shared with
 * M3-3's list and M3-4's optimistic-pending insert.
 */
export function useRecallMessage(conversationId: string | null) {
  const qc = useQueryClient();
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useMutation<
    { id: string; recalledAt: string },
    Error,
    { messageId: string },
    { previous: InfiniteData<MessagesPage> | undefined }
  >({
    mutationFn: ({ messageId }) => recallMessage({ messageId }),
    onMutate: async ({ messageId }) => {
      const queryKey = ['messages', userId, conversationId] as const;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<InfiniteData<MessagesPage>>(queryKey);

      if (previous) {
        const optimisticRecalledAt = new Date().toISOString();
        qc.setQueryData<InfiniteData<MessagesPage>>(queryKey, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === messageId
                ? {
                    ...item,
                    body: RECALLED_BODY_SENTINEL,
                    recalledAt: optimisticRecalledAt,
                  }
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
