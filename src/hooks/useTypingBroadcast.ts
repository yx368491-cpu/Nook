import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Composer-side typing broadcast (M4-1).
 *
 * Pairs with `useTypingReceivers` (ChatPanel-side) — both subscribe
 * track to the same `presence:<conversationId>` channel; supabase-js
 * dedupes the channel by name so both sides see the same instance.
 *
 * Lifecycle:
 *  - resolve / get-or-create the shared channel
 *  - on first non-empty keystroke (caller invokes `startTyping()`),
 *    fire `track({ typing: true })` and arm a 5 s idle timer
 *  - timer expiry, manual stop (broadcast, blur, unmount) → fire
 *    `track({ typing: false })` and disarm
 *
 * Channel lifetime: ChatPanel's `useTypingReceivers` owns the
 * removeChannel call. Composer only `.track()`s and explicitly
 * emits `track({ typing: false })` on unmount so we don't leave a
 * ghost `typing: true` lingering.
 */

const TYPING_IDLE_MS = 5000; // SPEC § 6.4 typing indicator window

export interface UseTypingBroadcastArgs {
  conversationId: string;
  selfUserId: string | null;
}

export interface UseTypingBroadcastResult {
  /** Call on the first non-empty keystroke after a quiet gap. */
  startTyping: () => void;
  /** Call on send, attach, blur, or manual stop. */
  stopTyping: () => void;
}

export function useTypingBroadcast({
  conversationId,
  selfUserId,
}: UseTypingBroadcastArgs): UseTypingBroadcastResult {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentlyTrackingTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !selfUserId) return;
    const channel = supabase.channel(`presence:${conversationId}`, {
      config: { presence: { key: 'user_id' } },
    });
    channelRef.current = channel;
    // Subscribe so track() lands reliably. supabase-js buffers track()
    // pre-join but explicit subscribe is cleaner.
    channel.subscribe();
    return () => {
      // Best-effort final track(typing:false) on unmount. If the
      // channel is already gone (ChatPanel unmounted first → channel
      // removed), track() is a no-op.
      if (
        selfUserId &&
        currentlyTrackingTypingRef.current &&
        channelRef.current
      ) {
        try {
          void channelRef.current.track({
            user_id: selfUserId,
            online: true,
            typing: false,
          });
        } catch {
          // best-effort; ignore
        }
      }
      currentlyTrackingTypingRef.current = false;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      channelRef.current = null;
      // NB: we deliberately do NOT removeChannel here. ChatPanel's
      // useTypingReceivers owns the channel lifetime.
    };
  }, [conversationId, selfUserId]);

  const trackTyping = useCallback(
    (typing: boolean) => {
      const ch = channelRef.current;
      if (!ch || !selfUserId) return;
      void ch.track({
        user_id: selfUserId,
        online: true,
        typing,
      });
      currentlyTrackingTypingRef.current = typing;
    },
    [selfUserId],
  );

  const startTyping = useCallback(() => {
    if (!currentlyTrackingTypingRef.current) {
      trackTyping(true);
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      trackTyping(false);
      idleTimerRef.current = null;
    }, TYPING_IDLE_MS);
  }, [trackTyping]);

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (currentlyTrackingTypingRef.current) {
      trackTyping(false);
    }
  }, [trackTyping]);

  return { startTyping, stopTyping };
}
