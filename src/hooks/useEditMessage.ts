import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  editMessage,
  type MessageListItem,
  type MessagesPage,
} from '@/lib/api/chat';
import { useAuth } from '@/stores/useAuth';

/**
 * M4-3 — edit a text message's body within the 2-minute window.
 *
 * Mirrors `useSendTextMessage`'s optimistic-UI shape so the UX feels
 * native to the conversation: the bubble's body updates instantly,
 * then the Realtime UPDATE echo confirms (`onMessageUpdate` in
 * `useConversationRealtime` quietly re-merges the server version).
 *
 * Optimistic update flow:
 *   1. onMutate:
 *      - cancel pending ['messages', userId, convId] queries
 *      - snapshot previous cache
 *      - patch the cache in place: replace `body` + set `editedAt: <now>`
 *      - return the snapshot for rollback
 *   2. onError: roll back to the snapshot; bubble reverts to the
 *      old text (no flicker because the Realtime UPDATE echoed the
 *      non-mutation quietly).
 *   3. onSuccess: invalidate to converge with the server's authoritative
 *      state (sanity check; UI is already showing the right value).
 *
 * The queryKey matches `useInfiniteMessages` so the cache is shared.
 */
export function useEditMessage(conversationId: string | null) {
  const qc = useQueryClient();
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useMutation<
    { id: string; body: string; editedAt: string },
    Error,
    { messageId: string; newBody: string },
    { previous: InfiniteData<MessagesPage> | undefined }
  >({
    mutationFn: ({ messageId, newBody }) =>
      editMessage({ messageId, newBody }),
    onMutate: async ({ messageId, newBody }) => {
      const queryKey = ['messages', userId, conversationId] as const;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<InfiniteData<MessagesPage>>(queryKey);

      if (previous) {
        const optimisticEditedAt = new Date().toISOString();
        qc.setQueryData<InfiniteData<MessagesPage>>(queryKey, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === messageId
                ? { ...item, body: newBody, editedAt: optimisticEditedAt }
                : item,
            ),
          })),
        });
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback only — no rethrow (caller surfaces via error state).
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

export type { MessageListItem };
