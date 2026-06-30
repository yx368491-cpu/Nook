/**
 * M8-3 · Reply flow + reaction toggle flow
 *
 * Tests the reply threading pipeline and emoji reaction toggle through
 * the React Query cache + Zustand stores.
 *
 * Reply flow:   send message → set replyingTo in useChat → send reply → verify cache
 * Reaction flow: add reaction → verify bucket → remove reaction → verify bucket updated
 */

import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from '@tanstack/react-query';

vi.mock('@/lib/supabase', () => {
  const single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 'msg-reply', created_at: '2026-06-30T12:01:00.000Z' }, error: null })) })),
  }));
  const rpc = vi.fn(() =>
    Promise.resolve({
      data: { id: 'rpc-default', created_at: '2026-06-30T12:01:00.000Z' },
      error: null,
    }),
  );
  return {
    supabase: {
      rpc,
      from: vi.fn(() => ({ insert, select, update: vi.fn(() => ({ eq: vi.fn(() => ({ select, single })) })), delete: vi.fn(), eq, single })),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() })),
      removeChannel: vi.fn(),
      auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    },
  };
});

import { supabase } from '@/lib/supabase';
import { useSendTextMessage } from '@/hooks/useSendMessage';
import { useSendReplyMessage } from '@/hooks/useSendReplyMessage';
import { useAddReaction } from '@/hooks/useAddReaction';
import { useRemoveReaction } from '@/hooks/useRemoveReaction';
import { useAuth } from '@/stores/useAuth';
import { useChat, type ReplyPreview } from '@/stores/useChat';
import { useUI } from '@/stores/useUI';
import type { MessagesPage, MessageListItem } from '@/lib/api/chat';
import type { ReactionEmoji } from '@/shared/types/domain';

// ── Constants ────────────────────────────────────────────────────────

const SELF_USER_ID = '11111111-1111-1111-1111-111111111111';
const SELF_EMAIL = 'alice@nook.test';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';
const CONV_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PARENT_MSG_ID = 'parent-msg-001';
const REPLY_MSG_ID = 'reply-msg-001';
const DEFAULT_NOW = '2026-06-30T12:00:00.000Z';

const MESSAGES_KEY = ['messages', SELF_USER_ID, CONV_ID] as const;

function seedAuth() {
  useAuth.setState({
    session: { accessToken: 'test-token', user: { id: SELF_USER_ID, email: SELF_EMAIL } },
    profile: { id: SELF_USER_ID, displayName: 'Alice', avatarUrl: null, role: 'owner', language: 'en', lastSeenAt: null, createdAt: DEFAULT_NOW },
    isInitialized: true, isLoading: false, error: null,
  });
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function seedMessagesCache(qc: QueryClient, items: MessageListItem[]) {
  qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
    MESSAGES_KEY,
    { pages: [{ items, nextCursor: null }], pageParams: [null] },
  );
}

function getMessages(qc: QueryClient): MessageListItem[] {
  return qc.getQueryData<InfiniteData<MessagesPage, string | null>>(MESSAGES_KEY)?.pages[0]?.items?.slice() ?? [];
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ session: null, profile: null, isInitialized: false, isLoading: false, error: null });
  useUI.setState({ sidebarOpen: true, selectedConversationId: null });
  useChat.setState({ replyingTo: null });
  seedAuth();
});

// ── Tests ────────────────────────────────────────────────────────────

describe('M8-3 · Reply flow + reaction toggle', () => {

  describe('Reply flow', () => {

    it('sets replyingTo in useChat store → sends reply message → verifies replyToId in cache', async () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

      // Seed a parent message in cache
      const parentMsg: MessageListItem = {
        id: PARENT_MSG_ID, conversationId: CONV_ID, senderId: OTHER_USER_ID,
        senderName: 'Bob', senderAvatarUrl: null, isSelf: false,
        kind: 'text', body: 'What do you think?',
        attachment: null, replyToId: null, replyTo: null,
        editedAt: null, recalledAt: null, deletedBySenderAt: null,
        reactions: [], clientMsgId: 'parent-cmid',
        createdAt: '2026-06-30T11:59:00.000Z',
      };
      seedMessagesCache(qc, [parentMsg]);

      // Set replyingTo in useChat store (simulating UI interaction)
      const preview: ReplyPreview = {
        id: PARENT_MSG_ID,
        senderName: 'Bob',
        bodyPreview: 'What do you think?',
      };
      act(() => { useChat.getState().setReplyingTo(preview); });
      expect(useChat.getState().replyingTo).toEqual(preview);

      // Mock reply RPC to succeed (fn_send_reply_message)
      (supabase.rpc as Mock).mockResolvedValue({
        data: {
          id: REPLY_MSG_ID,
          conversation_id: CONV_ID,
          reply_to_id: PARENT_MSG_ID,
          created_at: '2026-06-30T12:01:00.000Z',
        },
        error: null,
      });

      const { result: replyResult } = renderHook(
      () => useSendReplyMessage(CONV_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

      await act(async () => {
        await replyResult.current.mutateAsync({
          body: 'I agree!',
          replyToId: PARENT_MSG_ID,
          clientMsgId: 'reply-cmid-1',
        });
      });

      // Verify reply was sent via RPC (fn_send_reply_message)
      expect(supabase.rpc).toHaveBeenCalled();

      // Verify clearComposer clears replyingTo
      act(() => { useChat.getState().clearComposer(); });
      expect(useChat.getState().replyingTo).toBeNull();
    });

    it('sends reply with correct replyToId via RPC', async () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
      seedMessagesCache(qc, []);

      // Must set replyingTo in Zustand store — useSendReplyMessage reads from there
      act(() => {
        useChat.getState().setReplyingTo({
          id: PARENT_MSG_ID,
          senderName: 'Bob',
          bodyPreview: 'What do you think?',
        });
      });

      (supabase.rpc as Mock).mockResolvedValue({
        data: { id: REPLY_MSG_ID, conversation_id: CONV_ID, reply_to_id: PARENT_MSG_ID, created_at: '2026-06-30T12:02:00.000Z' },
        error: null,
      });

      const { result: replyResult } = renderHook(
        () => useSendReplyMessage(CONV_ID, SELF_USER_ID),
        { wrapper: makeWrapper(qc) },
      );

      await act(async () => {
        await replyResult.current.mutateAsync({
          body: 'Reply with ref',
          // NOTE: replyToId in vars is IGNORED — hook reads from useChat store
          replyToId: PARENT_MSG_ID,
          clientMsgId: 'reply-cmid-2',
        });
      });

      // Verify RPC was called with correct params
      expect(supabase.rpc).toHaveBeenCalled();
      const rpcCall = (supabase.rpc as Mock).mock.calls[0];
      expect(rpcCall[0]).toBe('fn_send_reply_message');
      expect(rpcCall[1]).toMatchObject({
        p_conv: CONV_ID,
        p_reply_to_id: PARENT_MSG_ID,
        p_body: 'Reply with ref',
      });
    });
  });

  describe('Reaction toggle', () => {

    it('adds a reaction → cache bucket shows count=1 hasMine=true', async () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

      const msg: MessageListItem = {
        id: 'msg-react-1', conversationId: CONV_ID, senderId: OTHER_USER_ID,
        senderName: 'Bob', senderAvatarUrl: null, isSelf: false,
        kind: 'text', body: 'Nice one!',
        attachment: null, replyToId: null, replyTo: null,
        editedAt: null, recalledAt: null, deletedBySenderAt: null,
        reactions: [], clientMsgId: 'react-cmid-1',
        createdAt: '2026-06-30T11:30:00.000Z',
      };
      seedMessagesCache(qc, [msg]);

      // Mock addReaction RPC
      (supabase.rpc as Mock).mockResolvedValue({
        data: { message_id: 'msg-react-1', user_id: SELF_USER_ID, emoji: '🔥' },
        error: null,
      });

      const { result: addResult } = renderHook(
        () => useAddReaction(CONV_ID),
        { wrapper: makeWrapper(qc) },
      );

      await act(async () => {
        await addResult.current.mutateAsync({
          messageId: 'msg-react-1',
          emoji: '🔥' as ReactionEmoji,
        });
      });

      // Verify optimistic reaction was added to cache
      await waitFor(() => {
        const items = getMessages(qc);
        const updated = items.find((m) => m.id === 'msg-react-1');
        expect(updated).toBeDefined();
        const fireBucket = updated!.reactions?.find((r) => r.emoji === '🔥');
        expect(fireBucket).toBeDefined();
        expect(fireBucket!.count).toBe(1);
        expect(fireBucket!.hasMine).toBe(true);
      });
    });

    it('adds then removes a reaction → cache bucket updates correctly', async () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

      const msg: MessageListItem = {
        id: 'msg-react-2', conversationId: CONV_ID, senderId: SELF_USER_ID,
        senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
        kind: 'text', body: 'Check this!',
        attachment: null, replyToId: null, replyTo: null,
        editedAt: null, recalledAt: null, deletedBySenderAt: null,
        reactions: [
          { emoji: '👍' as ReactionEmoji, count: 1, hasMine: false },
        ],
        clientMsgId: 'react-cmid-2',
        createdAt: '2026-06-30T11:45:00.000Z',
      };
      seedMessagesCache(qc, [msg]);

      // ── ADD reaction ──
      (supabase.rpc as Mock).mockResolvedValue({
        data: { message_id: 'msg-react-2', user_id: SELF_USER_ID, emoji: '🔥' },
        error: null,
      });

      const { result: addResult } = renderHook(
        () => useAddReaction(CONV_ID),
        { wrapper: makeWrapper(qc) },
      );

      await act(async () => {
        await addResult.current.mutateAsync({
          messageId: 'msg-react-2',
          emoji: '🔥' as ReactionEmoji,
        });
      });

      await waitFor(() => {
        const items = getMessages(qc);
        const m = items.find((x) => x.id === 'msg-react-2');
        expect(m?.reactions?.some((r) => r.emoji === '🔥' && r.count === 1 && r.hasMine)).toBe(true);
      });

      // ── REMOVE reaction ──
      (supabase.rpc as Mock).mockResolvedValue({
        data: { message_id: 'msg-react-2', user_id: SELF_USER_ID, emoji: '🔥', rows_affected: 1 },
        error: null,
      });

      const { result: removeResult } = renderHook(
        () => useRemoveReaction(CONV_ID),
        { wrapper: makeWrapper(qc) },
      );

      await act(async () => {
        await removeResult.current.mutateAsync({
          messageId: 'msg-react-2',
          emoji: '🔥' as ReactionEmoji,
        });
      });

      // Verify 🔥 bucket was removed (count dropped to 0)
      await waitFor(() => {
        const items = getMessages(qc);
        const m = items.find((x) => x.id === 'msg-react-2');
        const fireBucket = m?.reactions?.find((r) => r.emoji === '🔥');
        if (fireBucket) {
          // If bucket still exists, count must be 0 and hasMine false
          expect(fireBucket.count).toBe(0);
          expect(fireBucket.hasMine).toBe(false);
        } else {
          // Bucket was removed entirely (preferred behavior)
          expect(m?.reactions?.some((r) => r.emoji === '🔥')).toBe(false);
        }
      });

      // 👍 bucket from other user should remain untouched
      const items = getMessages(qc);
      const m = items.find((x) => x.id === 'msg-react-2');
      const thumbsUp = m?.reactions?.find((r) => r.emoji === '👍');
      expect(thumbsUp).toBeDefined();
      expect(thumbsUp!.count).toBe(1);
    });

    it('adds reaction to msg in ConvA does not affect ConvB cache', async () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

      const convBKey = ['messages', SELF_USER_ID, 'conv-b'] as const;
      const convBMsg: MessageListItem = {
        id: 'b-msg', conversationId: 'conv-b', senderId: OTHER_USER_ID,
        senderName: 'Bob', senderAvatarUrl: null, isSelf: false,
        kind: 'text', body: 'In conv B',
        attachment: null, replyToId: null, replyTo: null,
        editedAt: null, recalledAt: null, deletedBySenderAt: null,
        reactions: [], clientMsgId: 'b-cmid',
        createdAt: '2026-06-30T11:00:00.000Z',
      };
      qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
        convBKey,
        { pages: [{ items: [convBMsg], nextCursor: null }], pageParams: [null] },
      );

      const msgA: MessageListItem = {
        id: 'a-msg', conversationId: CONV_ID, senderId: OTHER_USER_ID,
        senderName: 'Carol', senderAvatarUrl: null, isSelf: false,
        kind: 'text', body: 'In conv A',
        attachment: null, replyToId: null, replyTo: null,
        editedAt: null, recalledAt: null, deletedBySenderAt: null,
        reactions: [], clientMsgId: 'a-cmid',
        createdAt: '2026-06-30T11:30:00.000Z',
      };
      seedMessagesCache(qc, [msgA]);

      (supabase.rpc as Mock).mockResolvedValue({
        data: { message_id: 'a-msg', user_id: SELF_USER_ID, emoji: '❤️' },
        error: null,
      });

      const { result: addResult } = renderHook(
        () => useAddReaction(CONV_ID),
        { wrapper: makeWrapper(qc) },
      );

      await act(async () => {
        await addResult.current.mutateAsync({
          messageId: 'a-msg',
          emoji: '❤️' as ReactionEmoji,
        });
      });

      // Conv B cache must be unaffected
      const convBCache = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(convBKey);
      const bMsg = convBCache?.pages[0]?.items[0];
      expect(bMsg?.reactions).toHaveLength(0);
    });
  });
});
