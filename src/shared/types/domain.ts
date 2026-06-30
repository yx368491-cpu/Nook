/** User role in the system */
export type UserRole = 'owner' | 'friend';

/** Conversation type */
export type ConversationKind = 'direct' | 'group';

/**
 * Message content type.
 *
 * `'system'` is included even though the user-facing UI has no composer for
 * system rows — DB CHECK constraint `messages_kind_payload_chk` (migration
 * 0011 branch B) explicitly reserves `kind = 'system'` rows for server-side
 * emitted notices (e.g. "Alice joined the chat"). Including `'system'` in
 * the TS union:
 *   - allows `isMessageRecallable` (M4-4) and `isMessageDeletable` (M4-5)
 *     to compare `item.kind === 'system'` without TS2367 "no overlap" errors;
 *   - lets future hooks (e.g. M4-8 ambient presence system messages)
 *     type-narrow system rows cleanly without `as string` casts;
 *   - the M4-3 edit RPC and the M4-4 recall RPC both reject `kind = 'system'`
 *     server-side, so user-facing callers continue to NEVER produce or accept
 *     system rows.
 */
export type MessageKind = 'text' | 'image' | 'file' | 'system';

/** Reaction emoji (closed set of 6) */
export type ReactionEmoji = '👍' | '❤️' | '😂' | '👀' | '🔥' | '🙏';

/** User profile */
export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  language: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

/** Conversation */
export interface Conversation {
  id: string;
  kind: ConversationKind;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Conversation member */
export interface ConversationMember {
  userId: string;
  conversationId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  leftAt: string | null;
  lastReadAt: string | null;
}

/** Message */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  body: string | null;
  attachmentId: string | null;
  replyToId: string | null;
  editedAt: string | null;
  recalledAt: string | null;
  deletedBySenderAt: string | null;
  clientMsgId: string;
  createdAt: string;
}

/** Attachment */
export interface Attachment {
  id: string;
  storagePath: string;
  mime: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  uploadedBy: string;
  createdAt: string;
}

/** Invite */
export interface Invite {
  id: string;
  token: string;
  createdBy: string;
  targetKind: string | null;
  expiresAt: string;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}
