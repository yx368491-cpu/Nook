import { useEffect } from 'react';
import { subscribePresenceEvents } from '@/lib/realtime/conversationChannel';
import { usePresence } from '@/stores/usePresence';
import { useAuth } from '@/stores/useAuth';

/**
 * ChatPanel-side presence receiver (M4-1 typing + M4-8 ambient online).
 *
 * Mounts once per active conversation. Subscribes to the shared
 * `presence:<conversationId>` channel and, on every sync, atomically
 * writes BOTH:
 *
 *   1. `onlineUsers[conversationId]` — Set<userId> of peers currently
 *      `online: true` (self excluded). Powers F-ST-01 / AC.11 (the
 *      6 px lavender pulse dot next to the header avatar).
 *
 *   2. `typingUsers[conversationId]` — string[] of peers currently
 *      `typing: true` (self excluded). Powers F-MSG-08 / AC.05
 *      (the 3-dot ambient typing indicator).
 *
 * Self-actor gate is enforced at the receiver layer (NOT at UI):
 * per M4-7 RT closure pattern, we filter `peer.user_id === selfUserId`
 * here so the store never holds stale or self-tainted data. This also
 * means UI consumers can dot-product without re-deriving the
 * "am I excluded?" intent.
 *
 * Channel dedupe: supabase-js dedupes by channel name, so the same
 * channel instance is shared with `useTypingBroadcast` (which calls
 * `.track({ typing })` on the matching `presence:<conversationId>`
 * instance). Lifecycle stays split:
 *
 *   - ChatPanel's THIS hook owns subscribe/unsubscribe + peer writes.
 *   - Composer's `useTypingBroadcast` only `.track()`s.
 *
 * Reduced-motion: the pulse animation is internally a CSS keyframe on
 * Avatar's status-dot. The store cares only about presence payload,
 * NOT motion. Side-effect free re: prefers-reduced-motion — the dot
 * simply stays static (Avatar.tsx honors the CSS media query natively).
 *
 * Lifecycle:
 *   - mount → subscribe. onSync writes both maps.
 *   - conversationId change → cleanup unsubscribes, clears slice, new
 *     subscribe captures fresh peers for the new room.
 *   - unmount → cleanup unsubscribes, clears slice.
 */
export interface UseConversationPresenceArgs {
  conversationId: string;
}

export function useConversationPresence({
  conversationId,
}: UseConversationPresenceArgs): void {
  const setOnlineUsersForConv = usePresence((s) => s.setOnlineUsersForConv);
  const setTypingUsers = usePresence((s) => s.setTypingUsers);
  const clearConv = usePresence((s) => s.clearConv);
  /**
   * Per-callback re-read of selfUserId — defensive against stale closure
   * if the auth session refreshes while the channel is open. Same
   * discipline as the M4-7 self-actor gate (see DEVELOPMENT_LOG S30.0).
   */
  const selfUserId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribePresenceEvents(conversationId, {
      onSync: (peers) => {
        // ============================================================================
        // Online peers (M4-8 / F-ST-01 / AC.11)
        //
        // `presence.online === true` is the supabase-js signal that a peer
        // is currently `.track()`-ing on this channel. supabase dispatches
        // join/leave events on (un)track within < 100ms over WS — well
        // inside AC.11's "1s online / 10s offline" envelope.
        //
        // Filter chain (all 3 guards required to commit to store):
        //   1. peer.online === true          (presence state)
        //   2. peer.user_id is truthy        (schema sanity)
        //   3. peer.user_id !== selfUserId   (self-actor gate)
        // ============================================================================
        const onlineUserIds: string[] = [];
        const typingUserIds: string[] = [];
        for (const p of peers) {
          if (!p.online || !p.user_id) continue;
          if (p.user_id === selfUserId) continue;
          onlineUserIds.push(p.user_id);
          if (p.typing) {
            typingUserIds.push(p.user_id);
          }
        }
        setOnlineUsersForConv(conversationId, onlineUserIds);
        setTypingUsers(conversationId, typingUserIds);
      },
    });
    return () => {
      unsub();
      // Symmetric cleanup — switch to a different room or unmount the
      // panel must NOT leak the previous room's peer set into the new
      // one. Re-running onSync on the next mount will repopulate.
      clearConv(conversationId);
    };
  }, [conversationId, selfUserId, setOnlineUsersForConv, setTypingUsers, clearConv]);
}
