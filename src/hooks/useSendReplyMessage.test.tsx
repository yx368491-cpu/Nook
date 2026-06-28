import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from '@tanstack/react-query';
import { useSendReplyMessage } from './useSendReplyMessage';
import { useChat } from '@/stores/useChat';
import { useAuth } from '@/stores/useAuth';
import {
  MessageReplyError,
  type MessagesPage,
  type MessageListItem,
} from '@/lib/api/chat';

// ===========================================================================
// Module-level mocks
// ===========================================================================
//
// Full module-level stub of `@/lib/supabase` so the real `createClient(...)`
// from `@supabase/supabase-js` never runs in jsdom.
//
// Two dispatch surfaces are exercised by `useSendReplyMessage` beneath the
// underlying `useSendTextMessage`:
//   - `supabase.rpc('fn_send_reply_message', {...})`  — when replyToId is
//     set (M4-6 RPC path, enforces R-14 + R-15 server-side per migration
//     0013). Errors map to `MessageReplyError` via `mapReplyErrorCode`.
//   - `supabase.from('messages').insert(...).select().single()`  — when
//     replyToId is null (M3-4 plain-text REST path). Errors propagate
//     as plain `{ code: 'DB_ERROR', ... }` shaped objects, NOT a
//     `MessageReplyError`.
//
// The helpers below set up each surface independently so the assertion
// shape can branch on a single clear variable per test.
vi.mock('@/lib/supabase', () => {
  const rpc = vi.fn();
  const from = vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  }));
  const removeChannel = vi.fn();
  const channel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }));
  return {
    supabase: {
      rpc,
      from,
      removeChannel,
      channel,
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    },
  };
});

import { supabase } from '@/lib/supabase';

// ===========================================================================
// Per-surface helpers
// ===========================================================================

/** RPC success path — returns the JSONB row fn_send_reply_message emits. */
function mockRpcResolveOnce(payload: unknown) {
  (supabase.rpc as Mock).mockResolvedValueOnce({
    data: payload,
    error: null,
  });
}

/** RPC failure path — surface the PG `E_MSG_REPLY_FORBIDDEN: <reason>` shape. */
function mockRpcRejectOnce(error: { message: string }) {
  (supabase.rpc as Mock).mockResolvedValueOnce({
    data: null,
    error,
  });
}

/** REST `INSERT messages` success path (M3-4 plain text). */
function mockRestInsertResolveOnce(payload: unknown) {
  const single = vi
    .fn()
    .mockResolvedValueOnce({ data: payload, error: null });
  (supabase.from as Mock).mockReturnValueOnce({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ single })),
    })),
  });
  return single;
}

/** REST `INSERT messages` failure path (M3-4 plain text). */
function mockRestInsertRejectOnce(error: { message: string }) {
  const single = vi.fn().mockResolvedValueOnce({ data: null, error });
  (supabase.from as Mock).mockReturnValueOnce({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ single })),
    })),
  });
  return single;
}

// ===========================================================================
// Fixtures
// ===========================================================================

const SELF_USER_ID = '11111111-1111-1111-1111-111111111111';
const SELF_EMAIL = 'alice@nook.test';
const CONV_ID = '22222222-2222-2222-2222-222222222222';
const REPLY_TARGET_ID = 'msg-target';
const REPLY_TARGET_OWNER_ID = 'msg-target-owner';

function makeMessage(over: Partial<MessageListItem> = {}): MessageListItem {
  return {
    id: REPLY_TARGET_ID,
    conversationId: CONV_ID,
    senderId: REPLY_TARGET_OWNER_ID, // peer message being replied to
    senderName: 'Bob',
    senderAvatarUrl: null,
    isSelf: false,
    kind: 'text',
    body: 'Hello Alice',
    attachment: null,
    replyToId: null,
    replyTo: null,
    editedAt: null,
    recalledAt: null,
    deletedBySenderAt: null,
    clientMsgId: null,
    createdAt: '2026-06-28T12:00:00Z',
    ...over,
  };
}

function makeMessagesPage(
  items: MessageListItem[],
  nextCursor: string | null = null,
): MessagesPage {
  return { items, nextCursor };
}

const MESSAGES_QUERY_KEY = ['messages', SELF_USER_ID, CONV_ID] as const;

function seedAuth() {
  useAuth.setState({
    session: {
      accessToken: 'test-access-token',
      user: { id: SELF_USER_ID, email: SELF_EMAIL },
    },
    profile: {
      id: SELF_USER_ID,
      displayName: 'Alice',
      avatarUrl: null,
      role: 'owner',
      language: 'en',
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  });
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
  };
}

function seedQueryCache(qc: QueryClient, pages: MessagesPage[]) {
  qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
    MESSAGES_QUERY_KEY,
    {
      pages,
      pageParams: pages.map(() => null),
    },
  );
}

function seedReplyTarget(replyToId: string, senderName = 'Bob') {
  useChat.setState({
    replyingTo: {
      id: replyToId,
      senderName,
      bodyPreview: 'Hello Alice',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({
    session: null,
    profile: null,
    isInitialized: true,
    isLoading: false,
    error: null,
  });
  useChat.setState({ replyingTo: null });
  seedAuth();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('useSendReplyMessage — thin Zustand-aware send wrapper', () => {
  describe('mutateAsync — RPC dispatch + Zustand plumbing', () => {
    it('threads Zustand replyingTo.id as replyToId via fn_send_reply_message RPC', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);
      seedReplyTarget(REPLY_TARGET_ID);

      mockRpcResolveOnce({
        id: 'msg-new',
        conversation_id: CONV_ID,
        reply_to_id: REPLY_TARGET_ID,
        created_at: '2026-06-28T12:30:00.000Z',
      });

      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await result.current.mutateAsync({
          body: 'Hi back',
          clientMsgId: 'client-1',
        });
      });

      // The RPC was called once with the canonical arg shape:
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenCalledWith(
        'fn_send_reply_message',
        expect.objectContaining({
          p_conv: CONV_ID,
          p_reply_to_id: REPLY_TARGET_ID,
          p_body: 'Hi back',
          p_client_msg_id: 'client-1',
        }),
      );

      // Plain-text REST path was NOT taken:
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('plain-text path (Zustand replyingTo=null) takes REST INSERT, not RPC', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);

      mockRestInsertResolveOnce({
        id: 'msg-new',
        created_at: '2026-06-28T12:30:00.000Z',
      });

      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await result.current.mutateAsync({
          body: 'Just a regular message',
          clientMsgId: 'client-2',
        });
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
      const insertCall = (supabase.from as Mock).mock.results[0]!.value.insert
        .mock.calls[0]![0];
      expect(insertCall).toMatchObject({
        kind: 'text',
        body: 'Just a regular message',
        reply_to_id: null,
        client_msg_id: 'client-2',
      });
    });

    it('clears Zustand replyingTo on successful RPC send', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);
      seedReplyTarget(REPLY_TARGET_ID);

      mockRpcResolveOnce({
        id: 'msg-new',
        conversation_id: CONV_ID,
        reply_to_id: REPLY_TARGET_ID,
        created_at: '2026-06-28T12:30:00.000Z',
      });

      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      expect(useChat.getState().replyingTo).not.toBeNull();

      await act(async () => {
        await result.current.mutateAsync({
          body: 'Hi back',
          clientMsgId: 'client-3',
        });
      });

      await waitFor(() => {
        expect(useChat.getState().replyingTo).toBeNull();
      });
    });

    it('preserves Zustand replyingTo on rejected RPC send (user can retry)', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);
      seedReplyTarget(REPLY_TARGET_ID);

      mockRpcRejectOnce({
        message: 'E_MSG_REPLY_FORBIDDEN: reply_target_not_found',
      });

      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await expect(
          result.current.mutateAsync({
            body: 'Hi back',
            clientMsgId: 'client-4',
          }),
        ).rejects.toBeInstanceOf(MessageReplyError);
      });

      // Reply target preserved on error so the user can retry without
      // re-selecting the bubble.
      expect(useChat.getState().replyingTo).not.toBeNull();
      expect(useChat.getState().replyingTo!.id).toBe(REPLY_TARGET_ID);
    });

    it('throws Error("EMPTY_BODY") on whitespace-only body without any server call', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);
      seedReplyTarget(REPLY_TARGET_ID);

      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await expect(
          result.current.mutateAsync({
            body: '   ',
            clientMsgId: 'client-empty',
          }),
        ).rejects.toThrow('EMPTY_BODY');
      });

      // Neither RPC nor REST path was reached.
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Error class mapping', () => {
    it('rpc error message reply_target_wrong_conversation → MessageReplyError with WRONG_CONVERSATION code', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);
      seedReplyTarget(REPLY_TARGET_ID);

      mockRpcRejectOnce({
        message: 'E_MSG_REPLY_FORBIDDEN: reply_target_wrong_conversation',
      });

      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.mutateAsync({
            body: 'cross-conv probe',
            clientMsgId: 'client-cross',
          });
        } catch (err) {
          caught = err;
        }
      });

      expect(caught).toBeInstanceOf(MessageReplyError);
      expect((caught as MessageReplyError).code).toBe('WRONG_CONVERSATION');
    });

    it('rpc error message sender_not_member → MessageReplyError with NOT_MEMBER code', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);
      seedReplyTarget(REPLY_TARGET_ID);

      mockRpcRejectOnce({
        message: 'E_MSG_REPLY_FORBIDDEN: sender_not_member',
      });

      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.mutateAsync({
            body: 'unauthorized',
            clientMsgId: 'client-unauth',
          });
        } catch (err) {
          caught = err;
        }
      });

      expect(caught).toBeInstanceOf(MessageReplyError);
      expect((caught as MessageReplyError).code).toBe('NOT_MEMBER');
    });

    it('rpc error message bad_kind_system → MessageReplyError with BAD_KIND code', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);
      seedReplyTarget(REPLY_TARGET_ID);

      mockRpcRejectOnce({
        message: 'E_MSG_REPLY_FORBIDDEN: bad_kind_system',
      });

      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.mutateAsync({
            body: 'replying to system row',
            clientMsgId: 'client-system',
          });
        } catch (err) {
          caught = err;
        }
      });

      expect(caught).toBeInstanceOf(MessageReplyError);
      expect((caught as MessageReplyError).code).toBe('BAD_KIND');
    });
  });

  describe('Zustand subscription across sequential submits', () => {
    it('first submit (no reply) uses REST; subsequent submit (with reply) routes via RPC', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [makeMessagesPage([makeMessage()])]);

      // First submit: no reply → REST
      mockRestInsertResolveOnce({
        id: 'msg-a',
        created_at: '2026-06-28T12:30:00.000Z',
      });
      const { result } = renderHook(() => useSendReplyMessage(CONV_ID, SELF_USER_ID), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await result.current.mutateAsync({
          body: 'first',
          clientMsgId: 'client-a',
        });
      });

      expect(supabase.from).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).not.toHaveBeenCalled();

      // Second submit: with reply → RPC
      seedReplyTarget(REPLY_TARGET_ID);
      mockRpcResolveOnce({
        id: 'msg-b',
        conversation_id: CONV_ID,
        reply_to_id: REPLY_TARGET_ID,
        created_at: '2026-06-28T12:31:00.000Z',
      });

      await act(async () => {
        await result.current.mutateAsync({
          body: 'second (reply)',
          clientMsgId: 'client-b',
        });
      });

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenLastCalledWith(
        'fn_send_reply_message',
        expect.objectContaining({ p_reply_to_id: REPLY_TARGET_ID }),
      );

      // After second submit, replyingTo cleared
      expect(useChat.getState().replyingTo).toBeNull();
    });
  });
});
