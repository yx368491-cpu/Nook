import { supabase } from '@/lib/supabase';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import type {
  MessageKind,
  MessageListItem,
} from '@/lib/api/chat';
import type { UserRole } from '@/shared/types/domain';

/**
 * Realtime subscription helpers (M3-5).
 *
 * Two channel topologies per Nook-API-DESIGN § 6.1:
 *
 *   1. `conversation:<uuid>` — per active room
 *      INSERT + UPDATE on `messages` (filtered by conversation_id)
 *      INSERT + DELETE on `reactions` (M4-7 will consume; M3-5 no-op)
 *
 *   2. `user:<self_id>`     — global self channel
 *      INSERT + UPDATE on `conversation_members` (filtered by user_id)
 *      UPDATE on `profiles` (filtered by id = self — own profile only for M3-5)
 *
 * Both helpers return an `unsubscribe()` function intended to be called
 * from a `useEffect` cleanup so supabase-js sends the matching Leave
 * payload. Re-subscribing with the same channel name is a no-op
 * (supabase-js dedupes by name).
 *
 * RLS: the underlying JWT in `supabase` carries the current user's
 * identity, so realtime events are filtered by Postgres RLS policies —
 * no extra client-side ACL needed.
 */

// ============================================================================
// DB row shapes (the subset we care about, snake_case matching migrations)
// ============================================================================

interface RawMessageRow {
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

interface RawMembersRow {
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  last_read_at: string | null;
  left_at: string | null;
}

interface RawProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole | null;
}

// ============================================================================
// Handler contracts
// ============================================================================

export interface MessageChannelHandlers {
  /** Server-side INSERT on messages (excluding recalled/deleted-self mutations) */
  onMessageInsert?: (msg: MessageListItem) => void;
  /** Server-side UPDATE on messages (edit / recall / soft-delete-local) */
  onMessageUpdate?: (
    id: string,
    delta: Partial<MessageListItem>,
  ) => void;
  /** Reactions not consumed in M3-5; reserved for M4-7 */
  onReactionEvent?: (
    payload: RealtimePostgresChangesPayload<{
      message_id: string;
      user_id: string;
      emoji: string;
      created_at?: string;
    }>,
  ) => void;
}

export interface UserChannelHandlers {
  /** Member added/removed (new 1:1 from friend-signup EF or left_at set) */
  onMemberChange?: () => void;
  /** Self profile changed (display_name / avatar / language) */
  onProfileUpdate?: (id: string) => void;
}

// ============================================================================
// Subscribe helpers
// ============================================================================

/**
 * Subscribe to the active conversation's postgres_changes (messages + reactions).
 * Returns an unsubscribe function for useEffect cleanup.
 */
export function subscribeConversationEvents(
  conversationId: string,
  handlers: MessageChannelHandlers,
): () => void {
  if (!conversationId) return () => undefined;
  const channelName = `conversation:${conversationId}`;
  const channel: RealtimeChannel = supabase.channel(channelName);

  if (handlers.onMessageInsert) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const p = payload as RealtimePostgresChangesPayload<RawMessageRow>;
        if (!p.new) return;
        handlers.onMessageInsert!(projectInsert(p.new));
      },
    );
  }

  if (handlers.onMessageUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const p = payload as RealtimePostgresChangesPayload<RawMessageRow>;
        if (!p.new) return;
        handlers.onMessageUpdate!(p.new.id, projectUpdateDelta(p.new));
      },
    );
  }

  if (handlers.onReactionEvent) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reactions',
      },
      (payload) =>
        handlers.onReactionEvent!(
          payload as RealtimePostgresChangesPayload<{
            message_id: string;
            user_id: string;
            emoji: string;
            created_at?: string;
          }>,
        ),
    );
  }

  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to user-global postgres_changes (members + own profile).
 * Single channel per session, mounted at app-level layout.
 */
export function subscribeUserEvents(
  userId: string,
  handlers: UserChannelHandlers,
): () => void {
  if (!userId) return () => undefined;
  const channelName = `user:${userId}`;
  const channel: RealtimeChannel = supabase.channel(channelName);

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'conversation_members',
      filter: `user_id=eq.${userId}`,
    },
    () => handlers.onMemberChange?.(),
  );

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${userId}`,
    },
    (payload) => {
      const p = payload as RealtimePostgresChangesPayload<RawProfileRow>;
      if (p.new) handlers.onProfileUpdate?.(p.new.id);
    },
  );

  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// ============================================================================
// Project raw DB rows to MessageListItem
// ============================================================================

/**
 * Render-time defaults for sender info when the realtime payload doesn't
 * carry the joined profile. The listMessages query already joins
 * `sender:profiles(...)`; a subsequent invalidateQueries refetch
 * (triggered by ConversationHeader upstream) will populate them.
 *
 * Sender name starts as `?` and resolves after first refetch.
 */
const PLACEHOLDER_NAME = '?';

function projectInsert(row: RawMessageRow): MessageListItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: PLACEHOLDER_NAME,
    senderAvatarUrl: null,
    isSelf: false, // reconciled against `currentUserId` in caller hook
    kind: row.kind,
    body: row.body,
    attachment: null,
    replyToId: row.reply_to_id,
    editedAt: row.edited_at,
    recalledAt: row.recalled_at,
    deletedBySenderAt: row.deleted_by_sender_at,
    clientMsgId: row.client_msg_id,
    createdAt: row.created_at,
  };
}

/**
 * Project an UPDATE row to a partial delta. We only patch the
 * server-side-changeable fields; sender + attachment joins are
 * preserved from the cache row by the caller.
 */
function projectUpdateDelta(row: RawMessageRow): Partial<MessageListItem> {
  return {
    body: row.body,
    editedAt: row.edited_at,
    recalledAt: row.recalled_at,
    deletedBySenderAt: row.deleted_by_sender_at,
  };
}
