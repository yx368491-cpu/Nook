import { supabase } from '@/lib/supabase';
import type {
  ConversationKind,
  MessageKind,
  UserRole,
} from '@/shared/types/domain';

/**
 * Chat API — typed wrappers around Supabase REST + RPC.
 *
 * Surfaces:
 * - `listConversations()`           sidebar conversation rows  (M3-2)
 * - `listMessages()`                paginated history          (M3-3)
 * - `markConversationRead()`        bump `last_read_at`        (M3-3)
 * - `getAttachmentSignedUrl()`      signed URL for storage     (M3-3)
 */

// ============================================================================
// DB row shapes (snake_case; matches migration 0001..0008)
// ============================================================================

interface ConversationRow {
  id: string;
  kind: ConversationKind;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationMemberRow {
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  left_at: string | null;
  last_read_at: string | null;
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: UserRole | null;
  } | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: MessageKind;
  body: string | null;
  attachment_id: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  recalled_at: string | null;
  deleted_by_sender_at: string | null;
  client_msg_id: string | null;
  created_at: string;
}

type ConversationWithEmbeds = ConversationRow & {
  members: ConversationMemberRow[] | null;
  messages: MessageRow[] | null;
};

interface MessageRowEmbeds {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: MessageKind;
  body: string | null;
  attachment_id: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  recalled_at: string | null;
  deleted_by_sender_at: string | null;
  client_msg_id: string | null;
  created_at: string;
  // join: messages_sender_id_fkey → profiles
  sender: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  // join: messages_attachment_id_fkey → attachments
  attachment: {
    id: string;
    storage_path: string;
    mime: string;
    size_bytes: number;
    width: number | null;
    height: number | null;
    uploaded_by: string;
    created_at: string;
  } | null;
}

// ============================================================================
// Public API surface
// ============================================================================

export interface ConversationMemberSummary {
  /** Stable user id (FK → auth.users.id) */
  userId: string;
  /** Resolved from profiles.display_name; falls back to "?" if missing */
  displayName: string;
  /** Resolved from profiles.avatar_url */
  avatarUrl: string | null;
  /** Member role in this conversation only (not the global user role) */
  role: 'owner' | 'member';
}

export interface ConversationListItem {
  id: string;
  kind: ConversationKind;
  /**
   * Display title:
   * - `one_to_one` → other participant's displayName
   * - `group`      → `conversations.name`
   */
  title: string;
  /**
   * Display avatar URL:
   * - `one_to_one` → other participant's avatar_url
   * - `group`      → `conversations.avatar_url`
   */
  avatarUrl: string | null;
  /** ISO timestamp used for sorting (latest message createdAt, else updated_at) */
  lastActivityAt: string;
  /** Active members (left_at IS NULL) */
  members: ReadonlyArray<ConversationMemberSummary>;
  /** Most recent non-recalled, non-deleted message; null if conversation silent */
  lastMessage: {
    id: string;
    senderId: string;
    kind: MessageKind;
    body: string | null;
    createdAt: string;
  } | null;
  /**
   * Unread count:
   *   - messages with sender_id != self AND created_at > self.last_read_at
   *   - excludes recalled / deleted-by-sender
   */
  unreadCount: number;
}

export interface MessageListItem {
  id: string;
  conversationId: string;
  senderId: string;
  /** Resolved from profiles.display_name; falls back to "?" if missing */
  senderName: string;
  senderAvatarUrl: string | null;
  /** Computed from `currentUserId` param — flips Bubble alignment in UI */
  isSelf: boolean;
  kind: MessageKind;
  body: string | null;
  attachment: {
    id: string;
    storagePath: string;
    mime: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
  } | null;
  /** M4-6 reply threading — populated but unused in M3-3 */
  replyToId: string | null;
  editedAt: string | null;
  /** Already null due to SQL `.is('recalled_at', null)` */
  recalledAt: string | null;
  /** F-MSG-07 sender-only soft delete; only honored when `isSelf` */
  deletedBySenderAt: string | null;
  /** Idempotency key for outbox dedup (M5-3) */
  clientMsgId: string | null;
  createdAt: string;
}

export interface MessagesPage {
  items: ReadonlyArray<MessageListItem>;
  /**
   * Cursor for fetching strictly older messages: items last (oldest).
   * `null` when this page returned fewer than `limit` rows (no more history).
   */
  nextCursor: string | null;
}

const DEFAULT_MESSAGE_LIMIT = 50;

// ============================================================================
// Sidebar API (M3-2)
// ============================================================================

/**
 * Fetch conversations where `currentUserId` is an active member.
 * Result is sorted by `lastActivityAt` DESC.
 *
 * RLS does the membership filtering server-side (F-CONV-01 / ARCH § 5.3).
 */
export async function listConversations(
  currentUserId: string,
): Promise<ConversationListItem[]> {
  if (!currentUserId) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select(
      `
        id, kind, name, avatar_url, created_at, updated_at,
        members:conversation_members(
          user_id, role, joined_at, left_at, last_read_at,
          profile:profiles!conversation_members_user_id_fkey(
            id, display_name, avatar_url, role
          )
        ),
        messages:messages(
          id, sender_id, kind, body, attachment_id, reply_to_id, edited_at,
          recalled_at, deleted_by_sender_at, client_msg_id, created_at
        )
      `,
    )
    .filter('members.user_id', 'eq', currentUserId)
    .is('members.left_at', null)
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(50, { referencedTable: 'messages' })
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    throw {
      code: 'DB_ERROR',
      message: error.message,
      details: error.details ?? null,
    };
  }
  if (!data) return [];

  return data
    .map((conv) =>
      transformConversationListItem(
        conv as unknown as ConversationWithEmbeds,
        currentUserId,
      ),
    )
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

// ============================================================================
// Message history API (M3-3)
// ============================================================================

/**
 * Cursor-paginated message history for a conversation.
 *
 * Returns pages in `created_at DESC` order (newest first). Consumers should
 * sort ASC for chat-style display (older at top, newer at bottom).
 *
 * Cursor = the last (oldest) createdAt of the previous page. Next call uses
 * `.lt('created_at', cursor)` to fetch strictly older rows.
 *
 * SQL filters:
 *   - `recalled_at IS NULL`  — recalled messages are hidden for everyone
 *   - `deleted_by_sender_at` — left in SQL; transformed client-side so
 *     the body is shown to non-sender recipients (F-MSG-07 sender-only soft-delete)
 *
 * @throws AppError-shaped object on network / RLS / schema-cache errors
 */
export async function listMessages(args: {
  conversationId: string;
  currentUserId: string;
  beforeCursor?: string | null;
  limit?: number;
}): Promise<MessagesPage> {
  const {
    conversationId,
    currentUserId,
    beforeCursor,
    limit = DEFAULT_MESSAGE_LIMIT,
  } = args;
  if (!conversationId || !currentUserId) {
    return { items: [], nextCursor: null };
  }

  let q = supabase
    .from('messages')
    .select(
      `
        id, conversation_id, sender_id, kind, body, attachment_id, reply_to_id,
        edited_at, recalled_at, deleted_by_sender_at, client_msg_id, created_at,
        sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url),
        attachment:attachments!messages_attachment_id_fkey(
          id, storage_path, mime, size_bytes, width, height, uploaded_by, created_at
        )
      `,
    )
    .eq('conversation_id', conversationId)
    .is('recalled_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (beforeCursor) {
    q = q.lt('created_at', beforeCursor);
  }

  const { data, error } = await q;
  if (error) {
    throw {
      code: 'DB_ERROR',
      message: error.message,
      details: error.details ?? null,
    };
  }
  if (!data) return { items: [], nextCursor: null };

  const items = data.map((row) =>
    transformMessage(row as unknown as MessageRowEmbeds, currentUserId),
  );

  // nextCursor = oldest in this page; null when there's likely no more.
  const nextCursor =
    items.length === limit
      ? (items[items.length - 1]?.createdAt ?? null)
      : null;

  return { items, nextCursor };
}

// ============================================================================
// Read state + storage (M3-3)
// ============================================================================

/**
 * Bump `conversation_members.last_read_at = now()` for the current user in the
 * given conversation. Wraps the `fn_mark_conversation_read` RPC created in
 * M3-1 migration 0005 (security invoker, reads `auth.uid()`).
 *
 * Side-effect: callers should invalidate `['conversations']` query keys so
 * the sidebar's unread badges clear.
 */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('fn_mark_conversation_read', {
    p_conv: conversationId,
  });
  if (error) {
    throw {
      code: 'DB_ERROR',
      message: error.message,
      details: error.details ?? null,
    };
  }
}

/**
 * Create a 1-hour signed URL for an attachment stored in the `attachments`
 * bucket (private per M3-1 RLS). Used by image bubbles via the dedicated
 * `<AttachmentImage>` component and by file-download buttons on click.
 *
 * Callers should cache the URL for `staleTime ≈ expiresIn - 5min` to avoid
 * repeated signing requests.
 */
export async function getAttachmentSignedUrl(
  storagePath: string,
  expiresInSec = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(storagePath, expiresInSec);
  if (error) {
    throw {
      code: 'STORAGE_ERROR',
      message: error.message,
    };
  }
  return data.signedUrl;
}

// ============================================================================
// Internal transforms
// ============================================================================

function transformConversationListItem(
  conv: ConversationWithEmbeds,
  currentUserId: string,
): ConversationListItem {
  const activeMembers = (conv.members ?? []).filter((m) => m.left_at === null);
  const myMember =
    activeMembers.find((m) => m.user_id === currentUserId) ?? null;
  const otherMembers = activeMembers.filter(
    (m) => m.user_id !== currentUserId,
  );

  let title: string;
  let avatarUrl: string | null;
  if (conv.kind === 'one_to_one') {
    if (otherMembers.length === 1) {
      const other = otherMembers[0]!;
      title = other.profile?.display_name?.trim() || '?';
      avatarUrl = other.profile?.avatar_url ?? null;
    } else {
      title = conv.name?.trim() || '?';
      avatarUrl = conv.avatar_url;
    }
  } else {
    title =
      conv.name?.trim() ||
      otherMembers
        .map((m) => m.profile?.display_name?.trim() || '?')
        .join(', ') ||
      '?';
    avatarUrl = conv.avatar_url;
  }

  const visibleMessages = (conv.messages ?? [])
    .filter((m) => m.recalled_at === null && m.deleted_by_sender_at === null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const lastMessage = visibleMessages[0]
    ? {
        id: visibleMessages[0].id,
        senderId: visibleMessages[0].sender_id,
        kind: visibleMessages[0].kind,
        body: visibleMessages[0].body,
        createdAt: visibleMessages[0].created_at,
      }
    : null;

  const lastReadAt = myMember?.last_read_at ?? '1970-01-01T00:00:00Z';
  const unreadCount = visibleMessages.filter(
    (m) => m.sender_id !== currentUserId && m.created_at > lastReadAt,
  ).length;

  return {
    id: conv.id,
    kind: conv.kind,
    title,
    avatarUrl,
    lastActivityAt: lastMessage?.createdAt ?? conv.updated_at,
    members: activeMembers.map((m) => ({
      userId: m.user_id,
      displayName: m.profile?.display_name?.trim() || '?',
      avatarUrl: m.profile?.avatar_url ?? null,
      role: m.role,
    })),
    lastMessage,
    unreadCount,
  };
}

function transformMessage(
  row: MessageRowEmbeds,
  currentUserId: string,
): MessageListItem {
  const isSelf = row.sender_id === currentUserId;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender?.display_name?.trim() || '?',
    senderAvatarUrl: row.sender?.avatar_url ?? null,
    isSelf,
    kind: row.kind,
    body: row.body,
    attachment: row.attachment
      ? {
          id: row.attachment.id,
          storagePath: row.attachment.storage_path,
          mime: row.attachment.mime,
          sizeBytes: row.attachment.size_bytes,
          width: row.attachment.width,
          height: row.attachment.height,
        }
      : null,
    replyToId: row.reply_to_id,
    editedAt: row.edited_at,
    recalledAt: row.recalled_at, // always null due to .is('recalled_at', null)
    deletedBySenderAt: row.deleted_by_sender_at,
    clientMsgId: row.client_msg_id,
    createdAt: row.created_at,
  };
}
