import type { MessageReplyError } from '@/lib/api/chat';
import { useChat } from '@/stores/useChat';
import { useSendTextMessage } from '@/hooks/useSendMessage';

/**
 * M4-6 — thin semantic wrapper around `useSendTextMessage` that
 * automatically:
 *
 *   1. Reads `replyingTo` from the Composer-side Zustand store (`useChat`)
 *      on submit, threads it through the underlying text mutation as
 *      `replyToId`. M3-4 already wires `useChat.setReplyingTo({...})` on
 *      hover, so the data pipeline is: hover `↩` trigger → set `replyingTo`
 *      → user types → Composer → this hook → sendTextMessage → optimistic
 *      bubble appears with the `<ReplyCard>` chip.
 *
 *   2. Clears `replyingTo` on successful send. The Compose-side reply
 *      preview card auto-collapses because its source-of-truth is gone.
 *      On ERROR the target stays put — the user can fix and retry
 *      without re-clicking the bubble.
 *
 * Implementation note: this hook is deliberately a thin wrapper, not a
 * parallel useMutation. The optimistic-UI dance (`onMutate` cache patch,
 * `onError` rollback, `onSuccess` canonical swap) is already battle-tested
 * for plain text in M3-4 — duplicating it for replies would invite
 * drift. We just wrap and add two thin responsibilities: `replyToId`
 * plumbing + Zustand-side-effect orchestration.
 */
export function useSendReplyMessage(
  conversationId: string,
  currentUserId: string,
) {
  const textMut = useSendTextMessage(conversationId, currentUserId);
  const replyingTo = useChat((s) => s.replyingTo);
  const clearComposer = useChat((s) => s.clearComposer);

  return {
    ...textMut,
    mutateAsync: async (vars: {
      body: string;
      clientMsgId: string;
    }): Promise<{ id: string; createdAt: string; clientMsgId: string }> => {
      const replyToId = replyingTo?.id ?? null;
      // The `mutateAsync` from `useSendTextMessage` is the React-Query
      // wrapped version — it returns the same shape we assemble here.
      // We `await` it inside try/catch so we can clear Zustand on success
      // without clearing on error.
      try {
        const result = await textMut.mutateAsync({
          body: vars.body,
          replyToId,
          clientMsgId: vars.clientMsgId,
        });
        clearComposer();
        // Preserve the clientMsgId at the call site so callers (Composer)
        // don't have to thread it manually.
        return { ...result, clientMsgId: vars.clientMsgId };
      } catch (err) {
        // Leave replyingTo on error so the user can retry without
        // re-selecting the bubble. Re-raise for the Composer to surface
        // as an inline error strip.
        throw err;
      }
    },
  };
}

/** Re-export the typed error class so callers can branch on `.code`. */
export type { MessageReplyError };
