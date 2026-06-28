import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  removeReaction,
  applyReactionRemove,
  type MessageListItem,
  type MessagesPage,
} from '@/lib/api/chat';
import type { ReactionEmoji } from '@/shared/types/domain';
import { useAuth } from '@/stores/useAuth';

/**
 * M4-7 — remove the current user's emoji reaction from a message.
 *
 * Mirrors `useAddReaction`'s optimistic-UI shape. The chip row snaps to
 * `count - 1` (and removes the bucket entirely when count drops to 0) the
 * moment the picker emoji is clicked; the success invalidation converges
 * with the server's authoritative count in case two clicks raced.
 *
 * Optimistic update flow:
 *   1. onMutate:
 *      - cancel pending ['messages', userId, convId] queries
 *      - snapshot previous cache for rollback
 *      - patch the cache bucket for (messageId, emoji): decrement count +
 *        unset hasMine; if count drops to 0, REMOVE the bucket so an
 *        empty chip doesn't render
 *      - return snapshot
 *   2. onError: rollback to snapshot
 *   3. onSuccess: invalidate to converge with server's authoritative
 *      reactions count.
 *
 * Idempotent: server `fn_remove_reaction` is no-op-on-missing so a stale
 * picker click (e.g. row already removed server-side by Realtime echo)
 * doesn't surface an error.
 *
 * The queryKey matches `useInfiniteMessages` so the cache is shared with
 * the M3-3 list, M3-4's optimistic pending insert, M4-3/4/5/6 patches.
 */
export function useRemoveReaction(conversationId: string | null) {
  const qc = useQueryClient();
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useMutation<
    {
      messageId: string;
      emoji: ReactionEmoji;
      userId: string;
      rowsAffected: number;
    },
    Error,
    { messageId: string; emoji: ReactionEmoji },
    { previous: InfiniteData<MessagesPage, string | null> | undefined }
  >({
    mutationFn: ({ messageId, emoji }) =>
      removeReaction({ messageId, emoji }),
    onMutate: async ({ messageId, emoji }) => {
      const queryKey = ['messages', userId, conversationId] as const;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<
        InfiniteData<MessagesPage, string | null>
      >(queryKey);

      if (previous) {
        qc.setQueryData<
          InfiniteData<MessagesPage, string | null>
        >(queryKey, patchItem(previous, messageId, emoji));
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
 * Apply the optimistic bucket-remove across all pages of the infinite
 * cache. When count drops to 0, the bucket is removed entirely.
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
              reactions: applyReactionRemove(item.reactions, emoji, true),
            }
          : item,
      ),
    })),
  };
}

export type { MessageListItem };
