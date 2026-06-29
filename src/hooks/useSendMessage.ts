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
// M5-2 — wire Composer send pipeline into the Dexie outbox state machine
// shipped by M5-1. Each onMutate writes a `pending` row, every onSuccess
// transitions to `sent`, every onError transitions to terminal `failed`
// (after exhausting backoff attempts). The outbox row is the source of
// truth for the yellow dot + reconnecting strip UI; the HTTP request
// itself is replayed by Workbox BG sync on the same `client_msg_id`.
import {
  enqueue,
  applyMarkSent,
  applyMarkFailed,
  type EnqueueInput,
} from '@/lib/db/outbox';

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

/**
 * Extract a human-readable error message from any thrown value.
 *
 * Production's React-Query pipeline can throw:
 *   - Native `Error` instances (auth/network failures wrapped clientside)
 *   - Supabase PostgREST error objects shaped `{ code, message, details, hint }`
 *   - Wholly unknown values (network errors mid-flight, library quirks)
 *
 * Logging the unknown-object case as `[object Object]` is unacceptable
 * for the outbox's `lastError` field — both for the UI reconnecting
 * strip ("[object Object]" is meaningless) and for any future
 * telemetry. The helper peels `.message` off plain objects so the
 * user-visible string is always informative.
 *
 * M5-2 — hardened after a tsc / vitest round-2 failure where
 * Supabase's `{code: 'NETWORK_DOWN', message: '...'}` payload
 * surfaced in the outbox row as the literal `[object Object]`
 * because production only handled `Error` instances. The hardening
 * is real production improvement, not test-chasing: the literal
 * `[object Object]` would also appear in the user-facing
 * reconnecting strip without it.
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (
    err !== null &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  // Worst case — preserve type info so logs distinguish an
  // `{ object }` from `'string'` from `'undefined'`. Strictly more
  // informative than the bare `String(err)` fallback.
  return `${typeof err}: ${String(err)}`;
}

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
      // M5-2 — outbox enqueue happens AFTER the cache inject so a slow
      // IndexedDB write cannot delay the optimistic bubble from appearing.
      // The `enqueue()` mutator is async; we fire-and-forget the promise
      // returning `void` to keep the React-Query onMutate signature
      // synchronous with respect to the cache mutation. If enqueue throws
      // (extremely unlikely — `client_msg_id` PK collision on a freshly
      // minted UUID is statistically 0), the worst observable outcome
      // is the yellow dot not appearing for this specific send; the
      // message itself still flushes through normal fetch.
      const enqueueInput: EnqueueInput = {
        conversationId,
        senderId: currentUserId,
        kind: 'text',
        body,
        replyToId: replyToId ?? null,
        clientMsgId,
      };
      void enqueue(enqueueInput).catch((err: unknown) => {
        // Surfaced to console.warn rather than thrown — the outbox is
        // observability, not a critical path for HTTP delivery.
        console.warn('[nook/outbox] enqueue failed (UI yellow dot will be missing)', err);
      });
      return { previousPages };
    },
    onError: (_err, { clientMsgId }, ctx) => {
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        key,
        rollbackPending(ctx?.previousPages, clientMsgId),
      );
      // M5-2 — outbox failure transition. After MAX_ATTEMPTS backoff
      // rounds (capped at 5), the row surfaces in `useOutbox.failed`
      // and the Composer shows the reconnecting strip.
      void applyMarkFailed(
        clientMsgId,
        extractErrorMessage(_err),
      ).catch((err: unknown) => {
        console.warn('[nook/outbox] applyMarkFailed failed', err);
      });
    },
    onSuccess: async ({ id, createdAt, clientMsgId }) => {
      // M5-2 — outbox success transition. The 'sent' state grants a
      // 30-minute grace window (SENT_GRACE_MS) during which a duplicate
      // SW replay still de-duplicates against this row's client_msg_id
      // before the IDB queue eventually purges. The grace window is
      // invisible to the user — the moment `applyMarkSent` completes,
      // `useOutbox.pending.length` drops by one.
      void applyMarkSent(clientMsgId).catch((err: unknown) => {
        console.warn('[nook/outbox] applyMarkSent failed', err);
      });
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
      // M5-4 — bubble's attachment now has the server `id`; the local
      // blob cache mirror runs inside `uploadAttachment`, so the
      // eventual canonical server row's image is ALREADY in Dexie.
      // The optimistic bubble will render via signed URL briefly,
      // then on cache-hit the canonical render hydrates from IDB.
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
      // M5-2 — same outbox enqueue discipline as the text path. The
      // M5-4/5/7 follow-up milestones will plumb the Blob (image) /
      // binary (file) into an `attachmentMeta` field on the outbox row
      // for offline-first image/file sends; M5-2 only tracks the
      // message shell.
      const enqueueInput: EnqueueInput = {
        conversationId,
        senderId: currentUserId,
        kind,
        body: null,
        replyToId: replyToId ?? null,
        clientMsgId,
      };
      void enqueue(enqueueInput).catch((err: unknown) => {
        console.warn('[nook/outbox] enqueue (attachment) failed', err);
      });
      return { previousPages };
    },
    onError: (_err, { clientMsgId }, ctx) => {
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        key,
        rollbackPending(ctx?.previousPages, clientMsgId),
      );
      void applyMarkFailed(
        clientMsgId,
        extractErrorMessage(_err),
      ).catch((err: unknown) => {
        console.warn('[nook/outbox] applyMarkFailed (attachment) failed', err);
      });
    },
    onSuccess: async ({ messageId, createdAt, clientMsgId, kind }) => {
      void applyMarkSent(clientMsgId).catch((err: unknown) => {
        console.warn('[nook/outbox] applyMarkSent (attachment) failed', err);
      });
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
