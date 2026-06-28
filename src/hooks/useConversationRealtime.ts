import { useEffect } from 'react';
import {
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  subscribeConversationEvents,
  type MessageChannelHandlers,
} from '@/lib/realtime/conversationChannel';
import type {
  MessageListItem,
  MessagesPage,
} from '@/lib/api/chat';
import { useAuth } from '@/stores/useAuth';

const MESSAGES_QUERY_KEY = (userId: string, convId: string) =>
  ['messages', userId, convId] as const;

/**
 * Hook — subscribe per-conversation Realtime for the active room.
 *
 * Patches the `['messages', userId, convId]` infinite cache in place:
 *   - INSERT: dedupe against prior pending bubble (matched by
 *     `clientMsgId`) then append to page 0 if not present
 *   - UPDATE: patch by `id` (server-issued), preserving joined
 *     `sender` / `attachment` data from the cached row
 *
 * Also invalidates `['conversations']` on INSERT so the sidebar's
 * lastMessage preview + lastActivityAt ordering refresh.
 *
 * Mounted best at the MessageList (per active room) — cleanup on
 * unmount sends the matching Leave payload via supabase-js.
 */
export function useConversationRealtime(conversationId: string | null) {
  const qc = useQueryClient();
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  useEffect(() => {
    if (!conversationId || !userId) return;
    const key = MESSAGES_QUERY_KEY(userId, conversationId);

    const handlers: MessageChannelHandlers = {
      onMessageInsert: (rawMsg) => {
        // Reconcile isSelf — the realtime payload is sender_id only;
        // we know who we are via useAuth.
        const senderId = rawMsg.senderId;
        const msg: MessageListItem = {
          ...rawMsg,
          isSelf: senderId === userId,
        };

        // The realtime payload ships the bare row. The sidebar query
        // (`['conversations']`) already cached every profile for every
        // active member of every conversation I'm in, so we can resolve
        // the sender display_name + avatar_url without an extra fetch
        // (≤ 20 friends total — cache lookup is free).
        const conversationsCache = qc.getQueryData<unknown>(['conversations']);
        const enriched = resolveSenderFromSidebarCache(
          conversationsCache,
          senderId,
        );
        if (enriched) {
          msg.senderName = enriched.displayName;
          msg.senderAvatarUrl = enriched.avatarUrl;
        }

        qc.setQueryData<
          InfiniteData<MessagesPage, string | null> | undefined
        >(key, (prev) => upsertOrReplaceByClientMsgOrId(prev, msg));

        // Sidebar preview + ordering refresh — Nook ≤ 20 friends means
        // a 30s poll (per useConversations.ts refetchInterval) plus this
        // explicit invalidation keep sidebar fresh without channel fan-out.
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      },
      onMessageUpdate: (id, delta) => {
        qc.setQueryData<
          InfiniteData<MessagesPage, string | null> | undefined
        >(key, (prev) => patchById(prev, id, delta));
      },
      onReactionEvent: () => {
        // M4-7 will wire the reactions UI; mobile-side no-op for M3-5.
      },
    };

    const unsubscribe = subscribeConversationEvents(conversationId, handlers);
    return unsubscribe;
  }, [conversationId, userId, qc]);
}

// --------------------------------------------------------------------------
// Cache mutation helpers (kept internal; exposed for M3-4 optimistic swap
// alignment if needed later).
// --------------------------------------------------------------------------

/**
 * Upsert-by-clientMsgId-first-then-by-id semantics:
 *   1. If a row with the same `clientMsgId` exists (M3-4 optimistic
 *      pending bubble), replace it with the canonical server row.
 *      Preserve the prior senderName/avatarUrl join (cache already
 *      populated that data from the initial listMessages refetch).
 *   2. Else, if a row with the same server `id` exists, no-op
 *      (dedupe self-loopback echo).
 *   3. Else, append to page 0.
 */
function upsertOrReplaceByClientMsgOrId(
  pages: InfiniteData<MessagesPage, string | null> | undefined,
  msg: MessageListItem,
): InfiniteData<MessagesPage, string | null> {
  if (!pages) {
    return {
      pages: [{ items: [msg], nextCursor: null }],
      pageParams: [null],
    };
  }

  for (let pIdx = 0; pIdx < pages.pages.length; pIdx++) {
    const page = pages.pages[pIdx];
    if (!page) continue;
    for (let i = 0; i < page.items.length; i++) {
      const item = page.items[i];
      if (!item) continue;

      // 1. Match optimistic pending bubble by clientMsgId.
      if (
        msg.clientMsgId &&
        (item.clientMsgId === msg.clientMsgId ||
          item.id === `pending:${msg.clientMsgId}`)
      ) {
        const merged: MessageListItem = {
          ...item,
          id: msg.id,
          conversationId: msg.conversationId,
          body: msg.body,
          kind: msg.kind,
          attachment: msg.attachment ?? item.attachment,
          editedAt: msg.editedAt,
          recalledAt: msg.recalledAt,
          deletedBySenderAt: msg.deletedBySenderAt,
          replyToId: msg.replyToId,
          // preserve prev joins (sender display_name + avatar url)
          senderName: item.senderName === '?' ? msg.senderName : item.senderName,
          senderAvatarUrl: item.senderAvatarUrl ?? msg.senderAvatarUrl,
          isSelf: msg.isSelf,
          createdAt: msg.createdAt,
        };
        return replaceAt(pages, pIdx, i, merged);
      }
      // 2. Dedup self-loopback echo by id.
      if (item.id === msg.id) {
        return pages;
      }
    }
  }

  // 3. No match → append to page 0.
  const first = pages.pages[0];
  if (!first) return pages;
  return {
    ...pages,
    pages: [
      { ...first, items: [...first.items, msg] },
      ...pages.pages.slice(1),
    ],
  };
}

/**
 * Patch in-place by `id`. Only the fields present in `delta` are
 * updated; nested joins (`senderName` / `senderAvatarUrl`) are
 * preserved from the existing cached row.
 */
function patchById(
  pages: InfiniteData<MessagesPage, string | null> | undefined,
  id: string,
  delta: Partial<MessageListItem>,
): InfiniteData<MessagesPage, string | null> | undefined {
  if (!pages) return pages;
  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === id ? { ...item, ...delta } : item,
      ),
    })),
  };
}

function replaceAt(
  pages: InfiniteData<MessagesPage, string | null>,
  pageIndex: number,
  itemIndex: number,
  replacement: MessageListItem,
): InfiniteData<MessagesPage, string | null> {
  return {
    ...pages,
    pages: pages.pages.map((page, pIdx) => {
      if (pIdx !== pageIndex) return page;
      return {
        ...page,
        items: page.items.map((item, iIdx) =>
          iIdx === itemIndex ? replacement : item,
        ),
      };
    }),
  };
}

// --------------------------------------------------------------------------
// Sidebar member lookup — converts the cached ConversationListItem[] into
// a flat member-by-userId map so onMessageInsert can resolve sender display
// info without an extra Supabase query.
// --------------------------------------------------------------------------

interface SenderSummary {
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Pull the matching conversation_member from the cached sidebar query.
 * Returns `undefined` when the cache hasn't hydrated yet OR the sender is
 * from a conversation the user is no longer a member of (defensive for
 * stale-cache reads after a LEFT edge case).
 */
function resolveSenderFromSidebarCache(
  conversationsCache: unknown,
  senderUserId: string,
): SenderSummary | null {
  if (!Array.isArray(conversationsCache)) return null;
  for (const conv of conversationsCache) {
    if (
      conv &&
      typeof conv === 'object' &&
      'members' in conv &&
      Array.isArray((conv as { members: unknown[] }).members)
    ) {
      const members = (conv as { members: Array<{ userId?: unknown; displayName?: unknown; avatarUrl?: unknown }> }).members;
      const hit = members.find((m) => m.userId === senderUserId);
      if (hit && typeof hit.displayName === 'string') {
        return {
          displayName: hit.displayName,
          avatarUrl:
            typeof hit.avatarUrl === 'string' ? hit.avatarUrl : null,
        };
      }
    }
  }
  return null;
}
