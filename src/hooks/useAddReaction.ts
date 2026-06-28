import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  addReaction,
  applyReactionAdd,
  type MessageListItem,
  type MessagesPage,
} from '@/lib/api/chat';
import type { ReactionEmoji } from '@/shared/types/domain';
import { useAuth } from '@/stores/useAuth';

/**
 * M4-7 — add the current user's emoji reaction to a message.
 *
 * Mirrors the M4-3 edit / M4-4 recall / M4-5 delete / M4-6 reply optimistic
 * UI shape so the chip row updates the moment the picker emoji is clicked
 * — no flicker, no waiting for the round-trip. The Realtime INSERT echo
 * triggers a listMessages refetch on success which converges the cache to
 * the authoritative server count (in case two clicks raced).
 *
 * Optimistic update flow:
 *   1. onMutate:
 *      - cancel pending ['messages', userId, convId] queries so the in-flight
 *        listMessages refetch doesn't race the optimistic patch
 *      - snapshot previous cache for rollback
 *      - patch the cache bucket for (messageId, emoji): create or bump count
 *        + set hasMine = true (self-only call)
 *      - return snapshot
 *   2. onError: rollback to snapshot; picker shows the i18n error strip
 *   3. onSuccess: invalidate to converge with the server's authoritative
 *      reactions count (idempotent — re-applying the patch is a no-op
 *      because the same emoji just got bumped to count=N+1 by the server).
 *
 * The queryKey matches `useInfiniteMessages` so the cache is shared with
 * the M3-3 list, M3-4's optimistic pending insert, M4-3 edit / M4-4 recall
 * / M4-5 delete patches, and the M4-6 reply-threaded insert.
 */
export function useAddReaction(conversationId: string | null) {
  const qc = useQueryClient();
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useMutation<
    { messageId: string; emoji: ReactionEmoji; userId: string },
    Error,
    { messageId: string; emoji: ReactionEmoji },
    { previous: InfiniteData<MessagesPage, string | null> | undefined }
  >({
    mutationFn: ({ messageId, emoji }) =>
      addReaction({ messageId, emoji }),
    onMutate: async ({ messageId, emoji }) => {
      const queryKey = ['messages', userId, conversationId] as const;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<
        InfiniteData<MessagesPage, string | null>
      >(queryKey);

      if (previous) {
        const queryKeyTyped: typeof queryKey = queryKey;
        qc.setQueryData<
          InfiniteData<MessagesPage, string | null>
        >(queryKeyTyped, patchItem(previous, messageId, emoji));
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const queryKey = ['messages', userId, conversationId] as const;
      if (ctx?.previous) {
        qc.setQueryData(queryKey, ctx.previous);
      }
    },
    onSuccess: (_data, _vars) => {
      void qc.invalidateQueries({
        queryKey: ['messages', userId, conversationId] as const,
      });
    },
  });
}

/**
 * Apply the optimistic bucket-add across all pages of the infinite cache
 * without mutating pages we don't touch.
 */
function patchItem(
  pages: InfiniteData<MessagesPage, string | null>,
  messageId: string,
  emoji: ReactionEmoji,
): InfiniteData<MessagesPage, string | null> {
  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === messageId
          ? {
              ...item,
              reactions: applyReactionAdd(item.reactions, emoji, true),
            }
          : item,
      ),
    })),
  };
}

export type { MessageListItem };
