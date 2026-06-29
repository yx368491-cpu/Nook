import { create } from 'zustand';

/**
 * Presence store (M4-1 typing + M4-8 ambient online).
 *
 * Single Zustand singleton consumed by all chat surfaces:
 *
 * - `onlineUsers`: Map<conversationId, Set<userId>>
 *     Peers (excluding self) currently `online: true` in each room, keyed
 *     by conv. Per-conv shape chosen so 1:1 vs. group Signal interpretation
 *     can be derived symmetrically (any online = is set non-empty; exact
 *     online peer = `.has(userId)`).
 *
 * - `typingUsers`: Map<conversationId, string[]>
 *     Peers (excluding self) currently `typing: true` in each room, keyed
 *     by conv, ordered by RT arrival (stable enough for indicator).
 *
 * Both maps share the same `presence:<conversationId>` channel subscription
 * in `useConversationPresence`, which writes both keys in the same `onSync`
 * callback exactly once per presence sync event (single source of truth).
 *
 * Self-actor gate lives in the receiver hook (`useConversationPresence`)
 * per M4-7 lesson learned: optimistic + RT echo dedup depends on stable
 * `selfUserId` per callback. Storing self-excluded data here keeps the
 * shape already consumer-ready for `Avatar.status='online'` derivation.
 */

interface PresenceState {
  /**
   * Per-conv map of currently-online peer user-ids (self excluded).
   * Empty in rooms nobody is in. Stable across the room's mount lifetime.
   */
  onlineUsers: Map<string, Set<string>>;
  /**
   * Per-conv map of currently-typing peer user-ids (self excluded).
   * Empty array (NOT undefined) when nobody is typing — renders as null
   * via `Array.isArray(...) && .length === 0` in TypingIndicator.
   */
  typingUsers: Map<string, string[]>;

  /**
   * Replace the peer set for one conversation atomically. Receivers invoke
   * this on `onSync` with the freshly-computed `Set<userId>` (self excluded).
   * Idempotent — re-write the same set is a no-op reference-wise.
   */
  setOnlineUsersForConv: (
    conversationId: string,
    userIds: ReadonlyArray<string>,
  ) => void;
  /**
   * Replace the typing peer list for one conversation atomically. Order
   * preserved from the RT callback (stable information for the indicator).
   */
  setTypingUsers: (
    conversationId: string,
    userIds: ReadonlyArray<string>,
  ) => void;
  /**
   * Atomically clear BOTH online + typing slices for one conversation.
   * Called on `useEffect` cleanup of `useConversationPresence` so switching
   * rooms or unmounting a ChatPanel doesn't leak stale peer state into the
   * next room.
   */
  clearConv: (conversationId: string) => void;
  /**
   * Full reset (signout, account switch). Both maps emptied.
   */
  clear: () => void;
}

export const usePresence = create<PresenceState>((set) => ({
  onlineUsers: new Map(),
  typingUsers: new Map(),

  setOnlineUsersForConv: (conversationId, userIds) =>
    set((s) => {
      const next = new Map(s.onlineUsers);
      next.set(conversationId, new Set(userIds));
      return { onlineUsers: next };
    }),

  setTypingUsers: (conversationId, userIds) =>
    set((s) => {
      const next = new Map(s.typingUsers);
      next.set(conversationId, [...userIds]);
      return { typingUsers: next };
    }),

  clearConv: (conversationId) =>
    set((s) => {
      const nextOnline = new Map(s.onlineUsers);
      nextOnline.delete(conversationId);
      const nextTyping = new Map(s.typingUsers);
      nextTyping.delete(conversationId);
      return { onlineUsers: nextOnline, typingUsers: nextTyping };
    }),

  clear: () =>
    set({ onlineUsers: new Map(), typingUsers: new Map() }),
}));
