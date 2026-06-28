import { create } from 'zustand';

/**
 * useChat — Composer-local UI state (separate from `useUI` which holds
 * navigation/route-level concerns).
 *
 * M3-4 addition: `replyingTo` now carries the preview payload (sender
 * name + 60-char truncated body) so the Composer can render the
 * surface-2 reply card without round-tripping through the messages
 * virtualized cache (per thinker decision #4 — keeps Composer decoupled
 * from MessageList internals).
 *
 * The actual reply trigger UI (hover message → "回复" → setReply) is
 * wired in **M4-6**. M3-4 ships the recipient side only.
 */

export interface ReplyPreview {
  /** Stable message id (FK → messages.id) */
  id: string;
  /** Display name to show in the reply card header */
  senderName: string;
  /** Pre-computed body preview (whitespace-collapsed, 60-char clip) */
  bodyPreview: string;
}

interface ChatState {
  /** Currently active reply target. `null` when not replying. */
  replyingTo: ReplyPreview | null;
  /** Set / clear the reply target. Composer handles its own draft retention. */
  setReplyingTo: (preview: ReplyPreview | null) => void;
  /** Convenience: clear reply + clear local draft (called after successful send). */
  clearComposer: () => void;
}

export const useChat = create<ChatState>((set) => ({
  replyingTo: null,
  setReplyingTo: (preview) => set({ replyingTo: preview }),
  clearComposer: () => set({ replyingTo: null }),
}));
