import { supabase } from '@/lib/supabase';
import type {
  ConversationKind,
  MessageKind,
  ReactionEmoji,
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
  // M4-6 join: messages_reply_to_id_fkey → messages (the referenced
  // reply target). Hydrated for the `<ReplyCard>` preview chip; the
  // nested sender projection is RPC-side chained so the preview can
  // render the target's display_name without an extra round-trip.
  // `null` either when (a) the bubble is not a reply, or (b) the FK
  // resolved NULL (e.g. target hard-deleted by 30-day TTL — FK is
  // `ON DELETE SET NULL`).
  reply_to: {
    id: string;
    conversation_id: string;
    sender_id: string;
    kind: MessageKind;
    body: string | null;
    recalled_at: string | null;
    deleted_by_sender_at: string | null;
    created_at: string;
    sender: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
  // M4-7 join: messages.id ←→ reactions (M:N msg×user×emoji, 6 hardcoded
  // emojis). We deliberately hydrate just (emoji, user_id) — the rest
  // (message_id, created_at) is redundant for bucketing client-side where
  // `count` is the aggregate and `hasMine` is `user_id === self`.
  // `null` when the message has no reactions (LEFT JOIN default).
  reactions: {
    emoji: ReactionEmoji;
    user_id: string;
  }[] | null;
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
  /**
   * FK reference to the original `messages.id` being replied to.
   * Always populated when `replyTo !== null`; useful as a stable ID
   * for scroll-to-reply (v1.1+) and programmatic linkage independent
   * of the display preview below.
   */
  replyToId: string | null;
  /**
   * M4-6 — hydrated preview of the referenced message.
   *
   * Rendered as the `<ReplyCard>` chip ABOVE the bubble per SPEC
   * § 2.3 F-MSG-04 wording. The preview carries enough to render
   * a "(Recalled)" / "(Deleted)" muted placeholder WITHOUT a follow-up
   * `messages:SELECT WHERE id = ANY(<replyToIds>)` query — common
   * "what did Alice say I'm replying to?" gap that would otherwise
   * cost a round-trip per reply-having message.
   *
   * `null` when:
   *   - the message is not a reply (no FK set), OR
   *   - the target row was later hard-deleted by 30-day TTL (FK is
   *     `ON DELETE SET NULL` so the FK is null; we don't surface a
   *     phantom card)  — handled at hydration level by listMessages.
   *
   * `recalledAt` + `deletedBySenderAt` here are scoped to the
   * TARGET message, NOT the bubble they're labeling. This way the
   * `<ReplyCard>` adapts to the target's state without a second
   * fetch.
   */
  replyTo?: {
    id: string;
    senderName: string;
    senderAvatarUrl: string | null;
    kind: MessageKind;
    body: string | null;
    recalledAt: string | null;
    createdAt: string;
  } | null;
  editedAt: string | null;
  /** Already null due to SQL `.is('recalled_at', null)` */
  recalledAt: string | null;
  /** F-MSG-07 sender-only soft delete; only honored when `isSelf` */
  deletedBySenderAt: string | null;
  /**
   * M4-7 — bucketed reaction summary per emoji (CAP-15 / F-MSG-09).
   *
   * Server-side hydration comes from `listMessages` LEFT JOIN on
   * `reactions(emoji, user_id)`, aggregated client-side in
   * `transformMessage` into the chip-friendly shape consumed by
   * `<Bubble.Reactions>` and `<ReactionMenuTrigger>`. Each bucket
   * carries:
   *   - `emoji`   — one of the closed 6-whitelist (RP-15 / domain.ts)
   *   - `count`   — total reacts across all conversation members
   *   - `hasMine` — `true` when the current user has applied this emoji
   *                  (drives the chip's accent tint + tooltip "你的反应")
   *
   * Empty/undefined when the message has zero reactions — the UI then
   * renders only the picker trigger (hover/focus) without any chip row.
   *
   * Ordering constraint: buckets sorted by `count DESC, emoji ASC` so
   * the most-popular reactions bubble to the front of the chip row.
   */
  reactions?: ReadonlyArray<{
    emoji: ReactionEmoji;
    count: number;
    hasMine: boolean;
  }>;
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
        ),
        reply_to:messages!reply_to_id(
          id, conversation_id, sender_id, kind, body,
          recalled_at, deleted_by_sender_at, created_at,
          sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)
        ),
        reactions:reactions(emoji, user_id)
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
    replyTo: row.reply_to
      ? {
          id: row.reply_to.id,
          senderName: row.reply_to.sender?.display_name?.trim() || '?',
          senderAvatarUrl: row.reply_to.sender?.avatar_url ?? null,
          kind: row.reply_to.kind,
          body: row.reply_to.body,
          recalledAt:
            row.reply_to.recalled_at !== null
              ? new Date(row.reply_to.recalled_at).toISOString()
              : null,
          createdAt: row.reply_to.created_at,
        }
      : null,
    editedAt: row.edited_at,
    recalledAt: row.recalled_at, // always null due to .is('recalled_at', null)
    deletedBySenderAt: row.deleted_by_sender_at,
    reactions: bucketReactions(row.reactions ?? null, currentUserId),
    clientMsgId: row.client_msg_id,
    createdAt: row.created_at,
  };
}

/**
 * M4-7 — bucket the raw `reactions(emoji, user_id)` rows into the
 * chip-friendly `Array<{ emoji, count, hasMine }>` shape consumed by
 * `<Bubble.Reactions>` and the picker.
 *
 * Bucketing rules:
 *   - group rows by emoji
 *   - sum count per emoji
 *   - set hasMine = `userIds.includes(currentUserId)` (same user can
 *     react with several emojis simultaneously since the PK is
 *     `(message_id, user_id, emoji)` — Slack/Discord style — so
 *     multiple `hasMine` buckets can light up on the same message)
 *   - sort `count DESC, emoji ASC` for a stable visual order
 *
 * Returns `[]` when the source array is null or empty — callers can
 * safely `.length === 0` to hide the chip row.
 */
function bucketReactions(
  rows: Array<{ emoji: string; user_id: string }> | null,
  currentUserId: string,
): MessageListItem['reactions'] {
  if (!rows || rows.length === 0) return [];
  const map = new Map<ReactionEmoji, { count: number; hasMine: boolean }>();
  for (const row of rows) {
    const emoji = row.emoji as ReactionEmoji;
    const existing = map.get(emoji);
    if (existing) {
      existing.count += 1;
      if (row.user_id === currentUserId) existing.hasMine = true;
    } else {
      map.set(emoji, {
        count: 1,
        hasMine: row.user_id === currentUserId,
      });
    }
  }
  return Array.from(map.entries())
    .map(([emoji, { count, hasMine }]) => ({ emoji, count, hasMine }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.emoji.localeCompare(b.emoji);
    });
}

// ============================================================================
// Composer API (M3-4)
// ============================================================================

/**
 * Whitelist of acceptable attachment MIME types — mirrors the `attachments`
 * bucket policy in supabase/migrations/0007 alongside DATA-MODEL § 9.4.
 * The DB-side CHECK constraint on `attachments.size_bytes` is the ultimate
 * gate (≤ 52,428,800 bytes), but we validate locally first to avoid
 * wasted bandwidth on rejected uploads (thinker decision #8).
 */
export const ATTACHMENT_MIME_WHITELIST = [
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
export type AttachmentMime = (typeof ATTACHMENT_MIME_WHITELIST)[number];

export function isImageMime(mime: string): boolean {
  return mime.toLowerCase().startsWith('image/');
}

/** Hard 50 MiB ceiling — matches `attachments.size_bytes` DB CHECK (50 * 1048576). */
export const MAX_ATTACHMENT_BYTES = 52_428_800;

export interface UploadedAttachment {
  id: string;
  storagePath: string;
  mime: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  originalName: string;
}

export class AttachmentValidationError extends Error {
  constructor(
    public readonly code:
      | 'EMPTY_FILE'
      | 'TOO_LARGE'
      | 'UNSUPPORTED_MIME'
      | 'MISSING_MIME',
    message: string,
  ) {
    super(message);
    this.name = 'AttachmentValidationError';
  }
}

function validateAttachmentFile(file: File): void {
  if (file.size === 0) {
    throw new AttachmentValidationError('EMPTY_FILE', '文件为空');
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentValidationError(
      'TOO_LARGE',
      `文件超过 ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MiB 上限`,
    );
  }
  if (!file.type) {
    throw new AttachmentValidationError('MISSING_MIME', '浏览器未提供文件 MIME 类型');
  }
  if (!ATTACHMENT_MIME_WHITELIST.includes(file.type as AttachmentMime)) {
    throw new AttachmentValidationError(
      'UNSUPPORTED_MIME',
      `不支持的文件类型: ${file.type}`,
    );
  }
}

/**
 * Best-effort image dimension probe. Returns null when the file is not an
 * image, when the browser fails to decode, or when the user aborts. EXIF
 * stripping + canvas compression are deferred to M5-4 / M5-5 per TODO;
 * for M3-4 we upload the original bytes (DATA-MODEL R-30 — image 不压缩, 原图保真).
 */
async function probeImageDims(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (!isImageMime(file.type)) return null;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Upload a file to the `attachments` bucket + insert an `attachments` row
 * (SPEC § 6 BF-06 happy path).
 *
 * Flow:
 *   1. Local validation (size + MIME)
 *   2. Generate UUID-prefixed storage path: `<uuid>/<safe-filename>`
 *   3. Upload bytes via `supabase.storage.from('attachments').upload()`
 *   4. INSERT `attachments` row with `message_id = NULL`
 *      (the FK is backfilled by `sendAttachmentMessage` after the message row
 *      exists, so cleanup accounting at pg_cron J-01 stays consistent).
 *
 * @throws AttachmentValidationError for local validation failures
 * @throws { code: 'STORAGE_ERROR' | 'DB_ERROR', ... } for network / RLS errors
 */
export async function uploadAttachment(file: File): Promise<UploadedAttachment> {
  validateAttachmentFile(file);
  const dims = await probeImageDims(file);

  const fileId = crypto.randomUUID();
  const safeName =
    file.name.replace(/[^\w.\-]+/g, '_').slice(0, 100) || 'file';
  const storagePath = `${fileId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadError) {
    throw {
      code: 'STORAGE_ERROR',
      message: uploadError.message,
    };
  }

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      id: fileId,
      storage_path: storagePath,
      mime: file.type,
      size_bytes: file.size,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      original_name: file.name,
    })
    .select('id')
    .single();
  if (error) {
    // Best-effort cleanup of orphan storage object (no error propagation)
    void supabase.storage.from('attachments').remove([storagePath]);
    throw {
      code: 'DB_ERROR',
      message: error.message,
      details: error.details ?? null,
    };
  }

  return {
    id: data.id,
    storagePath,
    mime: file.type,
    sizeBytes: file.size,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    originalName: file.name,
  };
}

/**
 * Send a text message (CAP-09 / SPEC § 2.3 F-MSG-01 / BF-05).
 *
 * `clientMsgId` is the per-message idempotency key: callers MUST generate a
 * UUID before this call and reuse it for the optimistic-cache entry, the
 * messages query dedupe, and the future Dexie outbox (M5). The DB has a
 * UNIQUE constraint on `messages.client_msg_id` (migration 0001).
 *
 * @throws { code: 'DB_ERROR' } on RLS / constraint failures
 * @throws Error('EMPTY_BODY') when body is whitespace-only
 */
export async function sendTextMessage(args: {
  conversationId: string;
  senderId: string;
  body: string;
  replyToId?: string | null;
  clientMsgId: string;
}): Promise<{ id: string; createdAt: string }> {
  const { conversationId, senderId, body, replyToId, clientMsgId } = args;
  const trimmed = body.trim();
  if (!trimmed) throw new Error('EMPTY_BODY');

  // ----- M4-6 RPC dispatch: when caller carries a replyToId, send via
  // `fn_send_reply_message` (SECURITY INVOKER, migration 0013) so R-14
  // (same-conversation invariant) + R-15 (sender active-member) are
  // enforced server-side. The plain-text REST INSERT path stays for
  // non-reply sends because it skips the RPC round-trip overhead.
  if (replyToId) {
    const { data, error } = await supabase.rpc('fn_send_reply_message', {
      p_conv: conversationId,
      p_reply_to_id: replyToId,
      p_body: trimmed,
      p_client_msg_id: clientMsgId,
    });
    if (error) {
      throw new MessageReplyError(mapReplyErrorCode(error.message), error.message);
    }
    const row = data as {
      id: string;
      conversation_id: string;
      reply_to_id: string;
      created_at: string;
    };
    return { id: row.id, createdAt: row.created_at };
  }

  // ----- Plain-text REST path (M3-4 legacy) -----
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      kind: 'text',
      body: trimmed,
      reply_to_id: replyToId ?? null,
      client_msg_id: clientMsgId,
    })
    .select('id, created_at')
    .single();
  if (error) {
    throw {
      code: 'DB_ERROR',
      message: error.message,
      details: error.details ?? null,
    };
  }
  return { id: data.id, createdAt: data.created_at };
}

// ============================================================================
// Reply API (M4-6) — sender-threaded reply, same-conversation enforced
// ============================================================================

/**
 * Custom error for rejected replies. Mirrors `MessageDeleteError` /
 * `MessageRecallError` shape so callers can branch on `.code` consistently
 * across the M4-3/4/5/6 quartet.
 */
export class MessageReplyError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'WRONG_CONVERSATION'
      | 'NOT_MEMBER'
      | 'BAD_KIND'
      | 'DB_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'MessageReplyError';
  }
}

/**
 * Map PG `E_MSG_REPLY_FORBIDDEN: <reason>` detail into a stable
 * client-side code. Symmetric to the M4-3/4/5 mappers — keeps the
 * client error-mapping logic aligned and unified.
 */
function mapReplyErrorCode(message: string): MessageReplyError['code'] {
  if (/reply_target_not_found|not[_\s-]?found|missing/i.test(message))
    return 'NOT_FOUND';
  if (/wrong[_\s-]?conver|cross[_\s-]?conv/i.test(message))
    return 'WRONG_CONVERSATION';
  if (/sender_not_member|not[_\s-]?member/i.test(message))
    return 'NOT_MEMBER';
  // Server raises `bad_kind_<k>` (e.g. `bad_kind_system`,
  // `bad_kind_image`, `bad_kind_text`) or `bad_emoji_<x>` when the
  // caller passed an invalid emoji arg. Both signal a kind/arg
  // mismatch the client surfaces as BAD_KIND.
  if (/bad[_\s-]?(kind|emoji)/i.test(message)) return 'BAD_KIND';
  return 'DB_ERROR';
}

/**
 * Send a reply message that references an existing `messages.id` via
 * `reply_to_id`. Server-side enforcement via `fn_send_reply_message`
 * (SECURITY INVOKER) per migration 0013.
 *
 * Guards enforced server-side:
 *   - R-14  reply_to_id MUST be in the same conversation
 *   - R-15  auth.uid() MUST be an active member of the conversation
 *   - system messages are NOT replyable (server-emitted notices only)
 *
 * Idempotency: `clientMsgId` is the dedupe key (UNIQUE constraint on
 * `messages.client_msg_id`); a duplicate replay resumes the canonical row
 * via Postgres 23505 propagation.
 *
 * @throws MessageReplyError with stable code identifying which guard fired
 * @throws Error('EMPTY_BODY') when body is whitespace-only
 */
export async function sendReplyMessage(args: {
  conversationId: string;
  senderId: string;
  body: string;
  replyToId: string;
  clientMsgId: string;
}): Promise<{
  id: string;
  conversationId: string;
  replyToId: string;
  createdAt: string;
}> {
  const { conversationId, body, replyToId, clientMsgId } = args;
  const trimmed = body.trim();
  if (!trimmed) throw new Error('EMPTY_BODY');

  const { data, error } = await supabase.rpc('fn_send_reply_message', {
    p_conv: conversationId,
    p_reply_to_id: replyToId,
    p_body: trimmed,
    p_client_msg_id: clientMsgId,
  });
  if (error) {
    throw new MessageReplyError(mapReplyErrorCode(error.message), error.message);
  }
  const row = data as {
    id: string;
    conversation_id: string;
    reply_to_id: string;
    created_at: string;
  };
  return {
    id: row.id,
    conversationId: row.conversation_id,
    replyToId: row.reply_to_id,
    createdAt: row.created_at,
  };
}

/**
 * Send an image or file message that references an already-uploaded
 * `attachments` row (SPEC § 2.3 F-MSG-02/03 / BF-06).
 *
 * Calls `uploadAttachment` first, then INSERTs `messages` with the FK,
 * then best-effort UPDATE of `attachments.message_id` so the FK is
 * symmetrical (cleanup cron picks up either direction).
 */
export async function sendAttachmentMessage(args: {
  conversationId: string;
  senderId: string;
  kind: 'image' | 'file';
  file: File;
  replyToId?: string | null;
  clientMsgId: string;
}): Promise<{ messageId: string; attachmentId: string; createdAt: string }> {
  const { conversationId, senderId, kind, file, replyToId, clientMsgId } = args;

  const uploaded = await uploadAttachment(file);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      kind,
      attachment_id: uploaded.id,
      reply_to_id: replyToId ?? null,
      client_msg_id: clientMsgId,
    })
    .select('id, created_at')
    .single();
  if (error) {
    // Best-effort: clean up the attachment row + storage object
    void supabase.from('attachments').delete().eq('id', uploaded.id);
    void supabase.storage.from('attachments').remove([uploaded.storagePath]);
    throw {
      code: 'DB_ERROR',
      message: error.message,
      details: error.details ?? null,
    };
  }

  // Symlink attachments.message_id → newly created message.id (best-effort).
  void supabase
    .from('attachments')
    .update({ message_id: data.id })
    .eq('id', uploaded.id);

  return {
    messageId: data.id,
    attachmentId: uploaded.id,
    createdAt: data.created_at,
  };
}

// ============================================================================
// Edit API (M4-3) — 2-minute window, server-enforced
// ============================================================================

/** 2-minute edit window — matches SPEC § 6 BF-08 + DB fn_edit_message. */
export const EDIT_WINDOW_MS = 2 * 60 * 1000;

/**
 * Custom error for rejected edits. The RPC raises
 * `E_MSG_EDIT_FORBIDDEN` with the failing guard in the message;
 * we map the message via regex into a stable code so callers can
 * branch on `{NOT_OWNER | WINDOW_EXPIRED | ALREADY_EDITED | NO_CHANGE
 * | NOT_FOUND | DB_ERROR}`.
 */
export class MessageEditError extends Error {
  constructor(
    public readonly code:
      | 'NOT_OWNER'
      | 'WINDOW_EXPIRED'
      | 'ALREADY_EDITED'
      | 'NO_CHANGE'
      | 'BAD_KIND'
      | 'NOT_FOUND'
      | 'DB_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'MessageEditError';
  }
}

/**
 * Edit a text message body within the 2-minute window. Server-side
 * enforcement via `fn_edit_message` (security invoker):
 *  - auth.uid() = sender_id
 *  - created_at + 2 minutes > now()
 *  - edited_at IS NULL (one-shot)
 *  - recalled_at IS NULL
 *  - body kind `text`
 *  - new body differs from current (no-op check)
 *  - body length 1..4000
 *
 * @throws MessageEditError with a stable code identifying which guard fired
 * @throws Error('EMPTY_BODY') when newBody is whitespace-only
 */
export async function editMessage(args: {
  messageId: string;
  newBody: string;
}): Promise<{ id: string; body: string; editedAt: string }> {
  const { messageId, newBody } = args;
  const trimmed = newBody.trim();
  if (!trimmed) throw new Error('EMPTY_BODY');

  const { data, error } = await supabase.rpc('fn_edit_message', {
    p_msg_id: messageId,
    p_new_body: trimmed,
  });
  if (error) {
    throw new MessageEditError(mapEditErrorCode(error.message), error.message);
  }
  // RPC returns a JSONB row like `{ id, body, edited_at }`. supabase-js
  // returns JSONB as a parsed object.
  const row = data as { id: string; body: string; edited_at: string };
  return { id: row.id, body: row.body, editedAt: row.edited_at };
}

/**
 * Map the PG `E_MSG_EDIT_FORBIDDEN: <reason>` detail into a stable
 * client-side code. Unrecognized reasons fall back to `DB_ERROR`
 * (caller surfaces the raw message in the inline error strip).
 */
function mapEditErrorCode(message: string): MessageEditError['code'] {
  if (/not[\s_-]?owner|unauthor/i.test(message)) return 'NOT_OWNER';
  if (/window|expired|2[\s_-]?min/i.test(message)) return 'WINDOW_EXPIRED';
  if (/already[\s_-]?(edit|once)/i.test(message)) return 'ALREADY_EDITED';
  if (/recalled/i.test(message)) return 'ALREADY_EDITED'; // already recalled ↔ cannot edit
  if (/no[\s_-]?change|identical|no[\s_-]?op/i.test(message)) return 'NO_CHANGE';
  if (/text[\s_-]?message|kind/i.test(message)) return 'BAD_KIND';
  if (/not[\s_-]?found|missing/i.test(message)) return 'NOT_FOUND';
  return 'DB_ERROR';
}

/**
 * Pure UI-side guard complementing the server check. Chat UI uses this
 * to hide the edit affordance proactively (so the user doesn't click
 * into an edit UI that will then fail).
 *
 *   - Self messages only
 *   - Text kind only (image/file are immutable per kind_payload_chk)
 *   - Not yet edited (single-shot)
 *   - Not recalled / not sender-soft-deleted
 *   - created_at within the 2-minute window
 */
export function isMessageEditable(item: {
  isSelf: boolean;
  createdAt: string;
  editedAt: string | null;
  recalledAt: string | null;
  deletedBySenderAt: string | null;
  kind: MessageKind;
}): boolean {
  if (!item.isSelf) return false;
  if (item.kind !== 'text') return false;
  if (item.editedAt !== null) return false;
  if (item.recalledAt !== null) return false;
  if (item.deletedBySenderAt !== null) return false;
  return Date.now() - Date.parse(item.createdAt) < EDIT_WINDOW_MS;
}

// ============================================================================
// Recall API (M4-4) — 2-minute window, soft recall (DB row stays, body → sentinel)
// ============================================================================

/** 2-minute recall window — matches SPEC § 6 BF-09 + DB fn_recall_message. */
export const RECALL_WINDOW_MS = 2 * 60 * 1000;

/**
 * Sentinel string written to `messages.body` when a message is recalled.
 * Per SPEC § 6 BF-09, both sender + recipients see the inert
 * "A message was recalled" placeholder; the actual body is replaced so an
 * offline log replay shows clearly what happened.
 */
export const RECALLED_BODY_SENTINEL = '__recalled__';

/**
 * Custom error for rejected recalls. Mirrors `MessageEditError` shape so
 * callers can branch on `.code` consistently.
 */
export class MessageRecallError extends Error {
  constructor(
    public readonly code:
      | 'NOT_OWNER'
      | 'WINDOW_EXPIRED'
      | 'ALREADY_RECALLED'
      | 'NOT_FOUND'
      | 'DB_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'MessageRecallError';
  }
}

/**
 * Recall a message within the 2-minute window. Server-side enforcement via
 * `fn_recall_message` (security invoker):
 *   - auth.uid() = sender_id (owner-only)
 *   - recalled_at IS NULL (single-shot, no double-recall)
 *   - kind != 'system'
 *   - created_at + 2 minutes > now() (window still open)
 *
 * Side-effects:
 *   - UPDATE messages SET body = '__recalled__', recalled_at = now()
 *
 * @throws MessageRecallError with stable code identifying which guard fired
 */
export async function recallMessage(args: {
  messageId: string;
}): Promise<{ id: string; recalledAt: string }> {
  const { messageId } = args;

  const { data, error } = await supabase.rpc('fn_recall_message', {
    p_msg_id: messageId,
  });
  if (error) {
    throw new MessageRecallError(
      mapRecallErrorCode(error.message),
      error.message,
    );
  }
  const row = data as { id: string; recalled_at: string };
  return { id: row.id, recalledAt: row.recalled_at };
}

/**
 * Map PG `E_MSG_RECALL_FORBIDDEN: <reason>` detail to a stable client code.
 * Symmetric to `mapEditErrorCode` regex — keeps client-mapping logic aligned.
 */
function mapRecallErrorCode(message: string): MessageRecallError['code'] {
  if (/not[\s_-]?owner|unauthor/i.test(message)) return 'NOT_OWNER';
  if (/window|expired|2[\s_-]?min/i.test(message)) return 'WINDOW_EXPIRED';
  if (/already[\s_-]?(recall|recalled|once)/i.test(message))
    return 'ALREADY_RECALLED';
  if (/not[\s_-]?found|missing/i.test(message)) return 'NOT_FOUND';
  return 'DB_ERROR';
}

/**
 * Pure UI-side guard for the recall affordance. Complements the server check.
 *
 *   - Self messages only
 *   - NOT system kind (system messages are server-created, immutable)
 *   - Not yet recalled (single-shot)
 *   - Not sender-soft-deleted
 *   - created_at within the 2-minute window
 *
 * Edit (M4-3) and recall (M4-4) are PARALLEL operations; a message may
 * be edited within 2 min OR recalled within 2 min independently.
 * Once recalled, fn_edit_message guards #3 (`recalled_at IS NULL`) blocks
 * any subsequent edit.
 */
export function isMessageRecallable(item: {
  isSelf: boolean;
  createdAt: string;
  recalledAt: string | null;
  deletedBySenderAt: string | null;
  kind: MessageKind;
}): boolean {
  if (!item.isSelf) return false;
  if (item.kind === 'system') return false;
  if (item.recalledAt !== null) return false;
  if (item.deletedBySenderAt !== null) return false;
  return Date.now() - Date.parse(item.createdAt) < RECALL_WINDOW_MS;
}

// ============================================================================
// Delete API (M4-5) — 2-minute window, sender-only soft-delete (recipient view preserved)
// ============================================================================

/** 2-minute delete window — matches SPEC F-MSG-07 + DB fn_delete_own_message. */
export const DELETE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Custom error for rejected deletes. Mirrors `MessageRecallError` shape so
 * callers can branch on `.code` consistently across the M4-3/4/5 trio.
 */
export class MessageDeleteError extends Error {
  constructor(
    public readonly code:
      | 'NOT_OWNER'
      | 'WINDOW_EXPIRED'
      | 'ALREADY_DELETED'
      | 'NOT_FOUND'
      | 'DB_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'MessageDeleteError';
  }
}

/**
 * Delete (sender-only soft-hide) a non-system message within the 2-minute
 * window. Server-side enforcement via `fn_delete_own_message` (security
 * invoker):
 *   - auth.uid() = sender_id (owner-only)
 *   - deleted_by_sender_at IS NULL (single-shot, no double-delete)
 *   - kind != 'system'
 *   - created_at + 2 minutes > now() (window still open)
 *
 * Side-effects:
 *   - UPDATE messages SET deleted_by_sender_at = now()
 *   - body / attachment_id / recalled_at / edited_at are INTACT
 *   - Recipient view of the conversation is unchanged (per F-MSG-07
 *     sender-only semantics).
 *
 * @throws MessageDeleteError with stable code identifying which guard fired
 */
export async function deleteOwnMessage(args: {
  messageId: string;
}): Promise<{ id: string; deletedAt: string }> {
  const { messageId } = args;

  const { data, error } = await supabase.rpc('fn_delete_own_message', {
    p_msg_id: messageId,
  });
  if (error) {
    throw new MessageDeleteError(
      mapDeleteErrorCode(error.message),
      error.message,
    );
  }
  const row = data as { id: string; deleted_at: string };
  return { id: row.id, deletedAt: row.deleted_at };
}

/**
 * Map PG `E_MSG_DELETE_FORBIDDEN: <reason>` detail to a stable client code.
 * Symmetric to `mapRecallErrorCode` regex — keeps client-mapping logic aligned.
 */
function mapDeleteErrorCode(message: string): MessageDeleteError['code'] {
  if (/not[\s_-]?owner|unauthor/i.test(message)) return 'NOT_OWNER';
  if (/window|expired|2[\s_-]?min/i.test(message)) return 'WINDOW_EXPIRED';
  if (/already[\s_-]?(delete|deleted|once)/i.test(message))
    return 'ALREADY_DELETED';
  if (/(not[\s_-]?found|missing)/i.test(message)) return 'NOT_FOUND';
  return 'DB_ERROR';
}

/**
 * Pure UI-side guard for the delete affordance. Complements the server check.
 *
 *   - Self messages only (sender-private per F-MSG-07)
 *   - NOT system kind (system messages are server-created, immutable)
 *   - Not yet deleted (single-shot)
 *   - Not recalled (already globally gone — deleting is no-op visually
 *     since recall's placeholder wins in render order; we hide the
 *     delete affordance to avoid offering a no-op action)
 *   - created_at within the 2-minute window
 *
 * Edit (M4-3) and delete (M4-5) are independent operations within 2 min. The
 * sender's UI hides the row (renders `messages.deleted` placeholder via
 * `isSelfDeleted`); recipients continue to see the original body exactly as
 * if the delete RPC had never fired.
 */
export function isMessageDeletable(item: {
  isSelf: boolean;
  createdAt: string;
  recalledAt: string | null;
  deletedBySenderAt: string | null;
  kind: MessageKind;
}): boolean {
  if (!item.isSelf) return false;
  if (item.kind === 'system') return false;
  if (item.recalledAt !== null) return false;
  if (item.deletedBySenderAt !== null) return false;
  return Date.now() - Date.parse(item.createdAt) < DELETE_WINDOW_MS;
}

// ===========================================================================
// Reaction API (M4-7) — 6-emoji toggle, server-enforced via fn_add/remove_reaction
// ===========================================================================

/**
 * Closed 6-emoji whitelist (CAP-15). Mirrors the DB CHECK constraint on
 * `reactions.emoji` (migration 0003) and the explicit allowlist inside the
 * fn_add/fn_remove RPCs (migration 0015). Re-exporting here so the rest of
 * the client (hooks + UI) imports a single source of truth.
 */
export const REACTION_EMOJIS: ReadonlyArray<ReactionEmoji> = [
  '👍',
  '❤️',
  '😂',
  '👀',
  '🔥',
  '🙏',
] as const;

/**
 * Custom error for rejected reaction toggles. Mirrors the M4-3/4/5/6 error
 * shape so callers can branch on `.code` consistently and the picker UI
 * can localize via `chat.reactionError.<code>` keys.
 *
 * Codes:
 *   - NOT_AUTHENTICATED  — caller signed-out (defensive; auth-required EF)
 *   - NOT_FOUND          — message id does not exist OR was hard-deleted
 *   - BAD_KIND           — target kind = 'system' (server-emitted, no reactions)
 *   - NOT_MEMBER         — caller is not an active conversation member
 *   - DB_ERROR           — catch-all for unrecognized PG detail
 */
export class MessageReactionError extends Error {
  constructor(
    public readonly code:
      | 'NOT_AUTHENTICATED'
      | 'NOT_FOUND'
      | 'BAD_KIND'
      | 'NOT_MEMBER'
      | 'DB_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'MessageReactionError';
  }
}

/**
 * Map PG `E_REACTION_FORBIDDEN: <reason>` detail into a stable client code.
 * Symmetric to `mapEditErrorCode` / `mapRecallErrorCode` / `mapDeleteErrorCode`
 * / `mapReplyErrorCode` — same regex shape so client-mapping logic stays
 * unified across the M4-3/4/5/6/7 pentachord.
 */
function mapReactionErrorCode(message: string): MessageReactionError['code'] {
  if (/not[_\\s-]?authent/i.test(message)) return 'NOT_AUTHENTICATED';
  if (/not[_\\s-]?found|missing/i.test(message)) return 'NOT_FOUND';
  if (/(?:^|[_\\s-])(?:bad|invalid)[_\\s-]?(?:kind|system)/i.test(message))
    return 'BAD_KIND';
  if (/not[_\\s-]?member/i.test(message)) return 'NOT_MEMBER';
  return 'DB_ERROR';
}

/**
 * Pure UI-side guard complementing the server check. The picker trigger is
 * hidden on system messages AND on recall-only-state bubbles to keep the
 * affordance semantically meaningful (a recalled bubble can still display
 * existing chip rows but new reactions are pointless).
 *
 * Allowed:
 *   - any non-system kind (text / image / file)
 *   - not recalled (recalled = conversation-wide hide; reactions stay on
 *     the underlying row but the bubble renders as the inert placeholder;
 *     we don't show the picker to avoid UI noise)
 *   - not self-deleted (sender-exclusive hide; the bubble still renders
 *     normally for recipients so the picker stays visible for them)
 */
export function isMessageReactable(item: {
  kind: MessageKind;
  recalledAt: string | null;
}): boolean {
  if (item.kind === 'system') return false;
  if (item.recalledAt !== null) return false;
  return true;
}

/**
 * Add (or no-op upsert) the current user's emoji reaction to a message.
 * Server-side enforcement via `fn_add_reaction` (SECURITY INVOKER, migration
 * 0015). Guards mirror `fn_send_reply_message` shape:
 *   - auth.uid() IS NOT NULL
 *   - target message exists and is NOT kind='system'
 *   - caller is an active conversation member
 *   - emoji in 6-whitelist (also CHECK-constrained inline on the table)
 *
 * Idempotency: ON CONFLICT (message_id, user_id, emoji) DO NOTHING, so a
 * re-click of the SAME emoji is a no-op success — same composite (msg,user,emoji)
 * row would otherwise fail PK insert.
 *
 * Distinct emojis from the same user coexist in the table (PK includes emoji),
 * so "切换" between emojis is a DELETE+INSERT pair, NOT a single call.
 *
 * @throws MessageReactionError with stable code identifying which guard fired
 */
export async function addReaction(args: {
  messageId: string;
  emoji: ReactionEmoji;
}): Promise<{
  messageId: string;
  userId: string;
  emoji: ReactionEmoji;
}> {
  const { messageId, emoji } = args;
  if (!REACTION_EMOJIS.includes(emoji)) {
    throw new MessageReactionError('DB_ERROR', `bad_emoji_${emoji}`);
  }
  const { data, error } = await supabase.rpc('fn_add_reaction', {
    p_msg_id: messageId,
    p_emoji: emoji,
  });
  if (error) {
    throw new MessageReactionError(
      mapReactionErrorCode(error.message),
      error.message,
    );
  }
  const row = data as {
    message_id: string;
    user_id: string;
    emoji: string;
  };
  return {
    messageId: row.message_id,
    userId: row.user_id,
    emoji: row.emoji as ReactionEmoji,
  };
}

/**
 * Remove the current user's emoji reaction from a message. Server-side
 * enforcement via `fn_remove_reaction` (SECURITY INVOKER, migration 0015).
 * Same 4-guard contract as `addReaction`.
 *
 * Idempotency: DELETE on a non-matching WHERE is 0-rows-affected and is
 * intentionally treated as success — a user can re-click DELETE on a
 * reaction they already removed without surfacing an error.
 *
 * @throws MessageReactionError with stable code identifying which guard fired
 */
export async function removeReaction(args: {
  messageId: string;
  emoji: ReactionEmoji;
}): Promise<{
  messageId: string;
  userId: string;
  emoji: ReactionEmoji;
  rowsAffected: number;
}> {
  const { messageId, emoji } = args;
  if (!REACTION_EMOJIS.includes(emoji)) {
    throw new MessageReactionError('DB_ERROR', `bad_emoji_${emoji}`);
  }
  const { data, error } = await supabase.rpc('fn_remove_reaction', {
    p_msg_id: messageId,
    p_emoji: emoji,
  });
  if (error) {
    throw new MessageReactionError(
      mapReactionErrorCode(error.message),
      error.message,
    );
  }
  const row = data as {
    message_id: string;
    user_id: string;
    emoji: string;
    rows_affected: number;
  };
  return {
    messageId: row.message_id,
    userId: row.user_id,
    emoji: row.emoji as ReactionEmoji,
    rowsAffected: row.rows_affected ?? 0,
  };
}

// ===========================================================================
// Cache-patch helpers (M4-7) — used by both optimistic mutation hooks
// AND Realtime projection. Keeping them in chat.ts so the source of truth
// for bucket shape + sort order is single-file.
// ===========================================================================

/**
 * Apply an ADD reaction to a `MessageListItem.reactions` bucket array.
 * - If the emoji bucket is missing, creates one with `count = 1,
 *   hasMine = <setHasMine flag>`.
 * - If the bucket exists, increments `count` and ORs in `hasMine`.
 * - Re-sorts by `(count DESC, emoji ASC)` to match `bucketReactions`'s
 *   stable order so the chip row stays in the same canonical sequence.
 *
 * Used by:
 *   - `useAddReaction.onMutate` (self optimistic patch)
 *   - `useConversationRealtime.onReactionEvent` (INSERT echo — foreign
 *     user reaction arrives over Realtime; for self, the optimistic
 *     patch + invalidateOnSettled already converges)
 */
export function applyReactionAdd(
  current: MessageListItem['reactions'],
  emoji: ReactionEmoji,
  setHasMine: boolean,
): MessageListItem['reactions'] {
  const list = current ? current.slice() : [];
  const idx = list.findIndex((b) => b.emoji === emoji);
  if (idx === -1) {
    list.push({ emoji, count: 1, hasMine: setHasMine });
  } else {
    const bucket = list[idx]!;
    list[idx] = {
      ...bucket,
      count: bucket.count + 1,
      hasMine: setHasMine || bucket.hasMine,
    };
  }
  list.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.emoji.localeCompare(b.emoji);
  });
  return list;
}

/**
 * Apply a REMOVE reaction to a `MessageListItem.reactions` bucket array.
 * - If the bucket is missing, returns the array untouched (defensive
 *   against out-of-order Realtime echoes).
 * - Decrements `count`. When `count` drops to 0, REMOVES the bucket so
 *   empty chips do not render on the bubble.
 * - `unsetHasMine` is OR'd negatively: if `unsetHasMine === true`,
 *   `hasMine` becomes false. Otherwise the OR of the existing flag is
 *   preserved (foreign user removes via Realtime → only their counts
 *   drop; my own `hasMine` is preserved since I'm NOT the foreign user).
 *
 * Used by:
 *   - `useRemoveReaction.onMutate` (self optimistic patch — always
 *     passes `unsetHasMine: true`)
 *   - `useConversationRealtime.onReactionEvent` (DELETE echo)
 */
export function applyReactionRemove(
  current: MessageListItem['reactions'],
  emoji: ReactionEmoji,
  unsetHasMine: boolean,
): MessageListItem['reactions'] {
  if (!current) return [];
  const idx = current.findIndex((b) => b.emoji === emoji);
  if (idx === -1) return current;
  const bucket = current[idx]!;
  const newCount = bucket.count - 1;
  if (newCount <= 0) {
    return current.filter((_, i) => i !== idx);
  }
  const list = current.slice();
  list[idx] = {
    ...bucket,
    count: newCount,
    hasMine: unsetHasMine ? false : bucket.hasMine,
  };
  list.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.emoji.localeCompare(b.emoji);
  });
  return list;
}
