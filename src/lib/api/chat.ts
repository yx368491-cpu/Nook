import { supabase } from '@/lib/supabase';
import type {
  ConversationKind,
  MessageKind,
  UserRole,
} from '@/shared/types/domain';

/**
 * Chat API — typed wrappers around Supabase REST + RPC.
 * Sidebar surface: `listConversations()` returns a flat shape that the
 * React UI can render without further SQL joins.
 */

// ============================================================================
// DB row shapes (snake_case; matches migration 0001..0003)
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
   * - `group`      → `conversations.name` (fallback to comma-joined members)
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
  /** Active members (left_at IS NULL) — used by group avatar fallback logic */
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
   *   - 0 if never read (last_read_at IS NULL → since epoch)
   */
  unreadCount: number;
}

/**
 * Fetch conversations where `currentUserId` is an active member.
 * Result is sorted by `lastActivityAt` DESC (latest message createdAt,
 * fallback to `conversations.updated_at`).
 *
 * RLS does the membership filtering server-side (F-CONV-01 / ARCH § 5.3);
 * client-side we only need `currentUserId` to compute per-row displays
 * (title/avatar/unreadCount for the requesting user).
 *
 * @throws AppError-shaped object on network / RLS / schema-cache errors
 */
export async function listConversations(
  currentUserId: string,
): Promise<ConversationListItem[]> {
  if (!currentUserId) return [];

  // Single round-trip: fetch conversations I am an active member of,
  // with member profiles + recent messages (limited to 50 newest per
  // conversation via PostgREST order query override below).
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
    // Surface a serialized error for the UI; do not throw raw PostgrestError
    throw {
      code: 'DB_ERROR',
      message: error.message,
      details: error.details ?? null,
    };
  }
  if (!data) return [];

  return data
    .map((conv) =>
      // The shape returned by PostgREST for a 3-level embed select is
      // union-narrowed by supabase-js in ways slightly different from our
      // hand-typed `ConversationWithEmbeds`. The runtime shape matches the
      // type's structural intent; route through `unknown` to keep the cast
      // honest at the type level without disabling the convention.
      transformConversationListItem(
        conv as unknown as ConversationWithEmbeds,
        currentUserId,
      ),
    )
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

// ============================================================================
// Internal transform
// ============================================================================

function transformConversationListItem(
  conv: ConversationWithEmbeds,
  currentUserId: string,
): ConversationListItem {
  const activeMembers = (conv.members ?? []).filter((m) => m.left_at === null);
  const myMember = activeMembers.find((m) => m.user_id === currentUserId) ?? null;
  const otherMembers = activeMembers.filter((m) => m.user_id !== currentUserId);

  // Title + avatar: 1:1 → other participant; group → conversation.name + avatar_url.
  // For 1:1 we require exactly one "other" member (a 1:1 should have 2 active members;
  // T-02 8-cap means 3+ here is degenerate data — fall through to name fallback).
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

  // Visible messages: not recalled, not soft-deleted-by-sender, newest first
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

  // Unread = messages newer than my last_read_at, sent by someone else
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
