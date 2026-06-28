/** User role in the system */
export type UserRole = 'owner' | 'friend';

/** Conversation type */
export type ConversationKind = 'one_to_one' | 'group';

/** Message content type */
export type MessageKind = 'text' | 'image' | 'file';

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
