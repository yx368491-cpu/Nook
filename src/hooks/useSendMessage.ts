import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  sendTextMessage,
  sendAttachmentMessage,
  listMessages,
  getAttachmentSignedUrl,
} from '@/lib/api/chat';
import type { MessagesPage, MessageListItem } from '@/lib/api/chat';
import { ATTACHMENT_MIME_WHITELIST, MAX_ATTACHMENT_BYTES } from '@/lib/api/chat';

/**
 * Composer message-send mutations (M3-4).
 *
 * Implements **optimistic UI** per ADR-014:
 *   1. `client_msg_id` (UUID v4) is generated upstream in the Composer
 *   2. `onMutate` injects a pending MessageListItem into the
 *      `['messages', conversationId]` infinite cache so the bubble appears
 *      instantly
 *   3. On success the real server row replaces the pending one (by id swap
 *      via a second cache write); on error we roll back to the previous cache
 *   4. The eventual Realtime echo (M3-5) will dedupe by `client_msg_id`
 *
 * Failure semantics for M3-4 (outbox deferred to M5-1/2/3):
 *   - On error the user-facing toast surfaces the message
 *   - No automatic retry queue yet; user can re-send manually
 */

const MESSAGES_KEY = (conversationId: string) =>
  ['messages', conversationId] as const;
const CONVERSATIONS_KEY = ['conversations'] as const;

const PREVIEW_TEXT_LEN = 60;

/** Truncate body for optimistic-cache preview; matches Sidebar's previewText. */
function clipPreview(body: string | null): string | null {
  if (body === null) return null;
  const trimmed = body.replace(/\s+/g, ' ').trim();
  return trimmed.length > PREVIEW_TEXT_LEN
    ? `${trimmed.slice(0, PREVIEW_TEXT_LEN - 1)}…`
    : trimmed;
}

interface OptimisticMessageInput {
  clientMsgId: string;
  senderId: string;
  kind: 'text' | 'image' | 'file';
  body?: string | null;
  attachmentId?: string | null;
  replyToId?: string | null;
}

interface OptimisticContext {
  previousPages: InfiniteData<MessagesPage, string | null> | undefined;
}

/**
 * Build a pending MessageListItem used during the optimistic insert. The id
 * is a synthetic `pending:<clientMsgId>` so we can locate & replace it on
 * success; the real Postgres id is unknown until POST resolves.
 *
 * Server-derived fields (sender name, attachment dims) cannot be guessed, so
 * we fall back to safe defaults; the MessageList bubble will rerender once
 * the canonical row replaces this one.
 */
function buildOptimisticMessage(
  input: OptimisticMessageInput,
): MessageListItem {
  return {
    id: `pending:${input.clientMsgId}`,
    conversationId: '', // overwritten by mutation arg via cache insertion path
    senderId: input.senderId,
    senderName: '…',
    senderAvatarUrl: null,
    isSelf: true,
    kind: input.kind,
    body: input.body ?? null,
    attachment: input.attachmentId
      ? {
          id: input.attachmentId,
          storagePath: '',
          mime: '',
          sizeBytes: 0,
          width: null,
          height: null,
        }
      : null,
    replyToId: input.replyToId ?? null,
    editedAt: null,
    recalledAt: null,
    deletedBySenderAt: null,
    clientMsgId: input.clientMsgId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * injectPendingMessage: scribbles the pending bubble onto page[0].items[0]
 * of the infinite cache so it appears at the bottom of the chat. We mutate
 * the cache in-place via `structuredClone`-safe JSON round-trip pattern.
 */
function injectPendingMessage(
  pages: InfiniteData<MessagesPage, string | null> | undefined,
  msg: MessageListItem,
  conversationId: string,
): InfiniteData<MessagesPage, string | null> {
  if (!pages) {
    return {
      pages: [{ items: [{ ...msg, conversationId }], nextCursor: null }],
      pageParams: [null],
    };
  }
  return {
    pageParams: pages.pageParams,
    pages: pages.pages.map((page, idx) =>
      idx === 0
        ? { ...page, items: [{ ...msg, conversationId }, ...page.items] }
        : page,
    ),
  };
}

/**
 * swapPendingForReal: replaces the pending bubble (identified by id prefix
 * `pending:`) in the first page, leaving everything else untouched.
 */
function swapPendingForReal(
  pages: InfiniteData<MessagesPage, string | null> | undefined,
  pendingClientMsgId: string,
  real: MessageListItem,
): InfiniteData<MessagesPage, string | null> | undefined {
  if (!pages) return pages;
  return {
    pageParams: pages.pageParams,
    pages: pages.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.clientMsgId === pendingClientMsgId ? real : item,
      ),
    })),
  };
}

/**
 * rollbackPending: removes the optimistic bubble on mutation error.
 */
function rollbackPending(
  pages: InfiniteData<MessagesPage, string | null> | undefined,
  pendingClientMsgId: string,
): InfiniteData<MessagesPage, string | null> | undefined {
  if (!pages) return pages;
  return {
    pageParams: pages.pageParams,
    pages: pages.pages.map((page) => ({
      ...page,
      items: page.items.filter(
        (item) => item.clientMsgId !== pendingClientMsgId,
      ),
    })),
  };
}

/**
 * Reine the canonical MessageListItem from a server row + sender profile.
 * Used to swap the optimistic bubble on success.
 */
function buildCanonicalFromServerRow(
  rawRow: {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender?: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
    kind: 'text' | 'image' | 'file';
    body: string | null;
    attachment?: {
      id: string;
      storage_path: string;
      mime: string;
      size_bytes: number;
      width: number | null;
      height: number | null;
      uploaded_by: string;
      created_at: string;
    } | null;
    reply_to_id: string | null;
    edited_at: string | null;
    recalled_at: string | null;
    deleted_by_sender_at: string | null;
    client_msg_id: string | null;
    created_at: string;
  },
  currentUserId: string,
): MessageListItem {
  return {
    id: rawRow.id,
    conversationId: rawRow.conversation_id,
    senderId: rawRow.sender_id,
    senderName: rawRow.sender?.display_name?.trim() || '?',
    senderAvatarUrl: rawRow.sender?.avatar_url ?? null,
    isSelf: rawRow.sender_id === currentUserId,
    kind: rawRow.kind,
    body: rawRow.body,
    attachment: rawRow.attachment
      ? {
          id: rawRow.attachment.id,
          storagePath: rawRow.attachment.storage_path,
          mime: rawRow.attachment.mime,
          sizeBytes: rawRow.attachment.size_bytes,
          width: rawRow.attachment.width,
          height: rawRow.attachment.height,
        }
      : null,
    replyToId: rawRow.reply_to_id,
    editedAt: rawRow.edited_at,
    recalledAt: rawRow.recalled_at,
    deletedBySenderAt: rawRow.deleted_by_sender_at,
    clientMsgId: rawRow.client_msg_id,
    createdAt: rawRow.created_at,
  };
}

/**
 * Send a text message with optimistic UI + idempotent rollback.
 */
export function useSendTextMessage(
  conversationId: string,
  currentUserId: string,
) {
  const qc = useQueryClient();
  const key = MESSAGES_KEY(conversationId);

  return useMutation<
    { id: string; createdAt: string; clientMsgId: string },
    Error,
    {
      body: string;
      replyToId: string | null;
      clientMsgId: string;
    },
    OptimisticContext
  >({
    mutationFn: async ({ body, replyToId, clientMsgId }) => {
      return sendTextMessage({
        conversationId,
        senderId: currentUserId,
        body,
        replyToId,
        clientMsgId,
      }).then((res) => ({ ...res, clientMsgId }));
    },
    onMutate: async ({ body, replyToId, clientMsgId }) => {
      await qc.cancelQueries({ queryKey: key });
      const previousPages = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(key);
      const pending = buildOptimisticMessage({
        clientMsgId,
        senderId: currentUserId,
        kind: 'text',
        body: clipPreview(body),
        replyToId,
      });
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        key,
        injectPendingMessage(previousPages, pending, conversationId),
      );
      return { previousPages };
    },
    onError: (_err, { clientMsgId }, ctx) => {
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        key,
        rollbackPending(ctx?.previousPages, clientMsgId),
      );
    },
    onSuccess: async ({ id, createdAt, clientMsgId }) => {
      // Swap pending bubble with canonical server row.
      const real = buildCanonicalFromServerRow(
        {
          id,
          conversation_id: conversationId,
          sender_id: currentUserId,
          sender: null, // sender profile resolved server-side via listMessages refetch
          kind: 'text',
          body: qc
            .getQueryData<InfiniteData<MessagesPage, string | null>>(key)
            ?.pages[0]?.items.find((m) => m.clientMsgId === clientMsgId)
            ?.body ?? null,
          attachment: null,
          reply_to_id: null,
          edited_at: null,
          recalled_at: null,
          deleted_by_sender_at: null,
          client_msg_id: clientMsgId,
          created_at: createdAt,
        },
        currentUserId,
      );
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        key,
        swapPendingForReal(qc.getQueryData(key), clientMsgId, real),
      );
      // Refresh sidebar so the new message bubbles up its preview + bumps
      // lastActivityAt ordering.
      void qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onSettled: () => {
      // Background resync — picks up the canonical sender profile and any
      // concurrent Realtime-inserted bubbles (M3-5).
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Send an image or file message. Pipeline:
 *   uploadAttachment → INSERT attachments → INSERT messages(attachment_id)
 * with optimistic bubble appearance as soon as `uploadAttachment` resolves.
 */
export function useSendAttachmentMessage(
  conversationId: string,
  currentUserId: string,
) {
  const qc = useQueryClient();
  const key = MESSAGES_KEY(conversationId);

  return useMutation<
    {
      messageId: string;
      attachmentId: string;
      createdAt: string;
      clientMsgId: string;
      kind: 'image' | 'file';
    },
    Error,
    {
      file: File;
      kind: 'image' | 'file';
      replyToId: string | null;
      clientMsgId: string;
    },
    OptimisticContext
  >({
    mutationFn: async ({ file, kind, replyToId, clientMsgId }) => {
      const res = await sendAttachmentMessage({
        conversationId,
        senderId: currentUserId,
        kind,
        file,
        replyToId,
        clientMsgId,
      });
      return { ...res, clientMsgId, kind };
    },
    // Optimistic insert is *minimal* for attachments — the bubble will show
    // a generic "sending file..." placeholder until the real row arrives.
    // (We do not attempt to render a local thumbnail for security/UX
    // simplicity; the row + signed URL hydration happens via onSettled.)
    onMutate: async ({ kind, replyToId, clientMsgId }) => {
      await qc.cancelQueries({ queryKey: key });
      const previousPages = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(key);
      // Provisional id; we don't know the storage path until upload completes,
      // so the bubble shows as a thin pending pill.
      const pending = buildOptimisticMessage({
        clientMsgId,
        senderId: currentUserId,
        kind,
        body: null,
        attachmentId: `pending:${clientMsgId}`,
        replyToId,
      });
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        key,
        injectPendingMessage(previousPages, pending, conversationId),
      );
      return { previousPages };
    },
    onError: (_err, { clientMsgId }, ctx) => {
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        key,
        rollbackPending(ctx?.previousPages, clientMsgId),
      );
    },
    onSuccess: async ({ messageId, createdAt, clientMsgId, kind }) => {
      const real = buildCanonicalFromServerRow(
        {
          id: messageId,
          conversation_id: conversationId,
          sender_id: currentUserId,
          sender: null,
          kind,
          body: null,
          attachment: undefined,
          reply_to_id: null,
          edited_at: null,
          recalled_at: null,
          deleted_by_sender_at: null,
          client_msg_id: clientMsgId,
          created_at: createdAt,
        },
        currentUserId,
      );
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        key,
        swapPendingForReal(qc.getQueryData(key), clientMsgId, real),
      );
      void qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onSettled: () => {
      // The settled refetch populates the real attachment row + signed
      // URLs (AttachmentImage fades the placeholder in via its own query).
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Re-export helpers used by Composer. */
export {
  ATTACHMENT_MIME_WHITELIST,
  MAX_ATTACHMENT_BYTES,
};
export type { OptimisticMessageInput };

// Re-export `listMessages` + `getAttachmentSignedUrl` so existing M3-3 imports
// of `useSendMessage` keep working without an extra import line.
export { listMessages, getAttachmentSignedUrl };
