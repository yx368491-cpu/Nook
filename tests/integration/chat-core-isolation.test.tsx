/**
 * M8-5 · Cross-conversation isolation
 *
 * Verifies that operations in one conversation do not affect the cache
 * or state of other conversations. This is critical for the multi-room
 * UX — switching tabs must show fresh, uncorrupted data for each room.
 *
 * Scenarios:
 *   1. Send in ConvA → ConvB's message cache untouched
 *   2. Edit in ConvA → ConvB's messages unaffected
 *   3. Recall in ConvA → ConvB's messages unaffected
 *   4. Delete in ConvA → ConvB's messages unaffected
 *   5. Reactions in ConvA → ConvB's reactions unaffected
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
  const rpc = vi.fn(() => Promise.resolve({ data: { id: 'rpc-default', created_at: '2026-06-30T12:01:00.000Z' }, error: null }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 'isolation-msg', created_at: '2026-06-30T12:01:00.000Z' }, error: null })) })),
  }));
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
import { useEditMessage } from '@/hooks/useEditMessage';
import { useRecallMessage } from '@/hooks/useRecallMessage';
import { useDeleteMessage } from '@/hooks/useDeleteMessage';
import { useAddReaction } from '@/hooks/useAddReaction';
import { useAuth } from '@/stores/useAuth';
import { useUI } from '@/stores/useUI';
import type { MessagesPage, MessageListItem } from '@/lib/api/chat';
import type { ReactionEmoji } from '@/shared/types/domain';

// ── Constants ────────────────────────────────────────────────────────

const SELF_USER_ID = '11111111-1111-1111-1111-111111111111';
const SELF_EMAIL = 'alice@nook.test';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';
const CONV_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CONV_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DEFAULT_NOW = '2026-06-30T12:00:00.000Z';

const CONV_A_KEY = ['messages', SELF_USER_ID, CONV_A_ID] as const;
const CONV_B_KEY = ['messages', SELF_USER_ID, CONV_B_ID] as const;

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

function makeMsg(id: string, convId: string, overrides?: Partial<MessageListItem>): MessageListItem {
  return {
    id, conversationId: convId, senderId: OTHER_USER_ID,
    senderName: 'Bob', senderAvatarUrl: null, isSelf: false,
    kind: 'text', body: `Message ${id}`,
    attachment: null, replyToId: null, replyTo: null,
    editedAt: null, recalledAt: null, deletedBySenderAt: null,
    reactions: [], clientMsgId: `cmid-${id}`,
    createdAt: DEFAULT_NOW,
    ...overrides,
  };
}

function getConvData(qc: QueryClient, key: readonly string[]) {
  return qc.getQueryData<InfiniteData<MessagesPage, string | null>>(key);
}

function expectConvUnchanged(qc: QueryClient, key: readonly string[], msgIds: string[], description: string) {
  const data = getConvData(qc, key);
  expect(data).toBeDefined();
  const items = data!.pages[0]!.items;
  expect(items.map((m) => m.id)).toEqual(msgIds);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ session: null, profile: null, isInitialized: false, isLoading: false, error: null });
  useUI.setState({ sidebarOpen: true, selectedConversationId: null });
  seedAuth();
});

// ── Tests ────────────────────────────────────────────────────────────

describe('M8-5 · Cross-conversation isolation', () => {

  it('send in ConvA → ConvB cache unchanged', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    // Seed ConvB with two messages
    const bMsg1 = makeMsg('b-1', CONV_B_ID);
    const bMsg2 = makeMsg('b-2', CONV_B_ID);
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_B_KEY,
      { pages: [{ items: [bMsg1, bMsg2], nextCursor: null }], pageParams: [null] },
    );
    // Seed ConvA empty
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_A_KEY,
      { pages: [{ items: [], nextCursor: null }], pageParams: [null] },
    );

    // Mock insert success
    (supabase.from as Mock).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { id: 'a-new-msg', created_at: '2026-06-30T12:05:00.000Z' }, error: null }),
          ),
        })),
      })),
      select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })) })),
      delete: vi.fn(),
      eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
    });

    const { result } = renderHook(
      () => useSendTextMessage(CONV_A_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await result.current.mutateAsync({
        body: 'To A only',
        replyToId: null,
        clientMsgId: 'iso-send-cmid',
      });
    });

    // ConvB must still have the same 2 messages
    expectConvUnchanged(qc, CONV_B_KEY, ['b-1', 'b-2'], 'ConvB after send in ConvA');
  });

  it('edit in ConvA → ConvB messages unaffected', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    // Seed ConvA with editable message
    const aMsg = makeMsg('a-1', CONV_A_ID, {
      senderId: SELF_USER_ID, isSelf: true, body: 'Original A body',
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    });
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_A_KEY,
      { pages: [{ items: [aMsg], nextCursor: null }], pageParams: [null] },
    );
    // Seed ConvB
    const bMsg = makeMsg('b-1', CONV_B_ID, { body: 'B fixed body' });
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_B_KEY,
      { pages: [{ items: [bMsg], nextCursor: null }], pageParams: [null] },
    );

    // Edit ConvA msg → succeed
    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: 'a-1', body: 'Edited A', edited_at: '2026-06-30T12:03:00.000Z' },
      error: null,
    });

    const { result } = renderHook(
      () => useEditMessage(CONV_A_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await result.current.mutateAsync({ messageId: 'a-1', newBody: 'Edited A' });
    });

    // ConvB body unchanged
    await waitFor(() => {
      const bData = getConvData(qc, CONV_B_KEY);
      expect(bData!.pages[0]!.items[0]!.body).toBe('B fixed body');
    });
  });

  it('recall in ConvA → ConvB messages unaffected', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const aMsg = makeMsg('a-1', CONV_A_ID, {
      senderId: SELF_USER_ID, isSelf: true, body: 'Recall me',
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    });
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_A_KEY,
      { pages: [{ items: [aMsg], nextCursor: null }], pageParams: [null] },
    );
    const bMsg = makeMsg('b-1', CONV_B_ID, { body: 'B intact' });
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_B_KEY,
      { pages: [{ items: [bMsg], nextCursor: null }], pageParams: [null] },
    );

    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: 'a-1', recalled_at: '2026-06-30T12:04:00.000Z' },
      error: null,
    });

    const { result } = renderHook(
      () => useRecallMessage(CONV_A_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await result.current.mutateAsync({ messageId: 'a-1' });
    });

    await waitFor(() => {
      const bData = getConvData(qc, CONV_B_KEY);
      expect(bData!.pages[0]!.items[0]!.body).toBe('B intact');
      expect(bData!.pages[0]!.items[0]!.recalledAt).toBeNull();
    });
  });

  it('delete in ConvA → ConvB messages unaffected', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const aMsg = makeMsg('a-1', CONV_A_ID, {
      senderId: SELF_USER_ID, isSelf: true,
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    });
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_A_KEY,
      { pages: [{ items: [aMsg], nextCursor: null }], pageParams: [null] },
    );
    const bMsg = makeMsg('b-1', CONV_B_ID, { body: 'B untouched' });
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_B_KEY,
      { pages: [{ items: [bMsg], nextCursor: null }], pageParams: [null] },
    );

    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: 'a-1', deleted_at: '2026-06-30T12:05:00.000Z' },
      error: null,
    });

    const { result } = renderHook(
      () => useDeleteMessage(CONV_A_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await result.current.mutateAsync({ messageId: 'a-1' });
    });

    await waitFor(() => {
      const bData = getConvData(qc, CONV_B_KEY);
      expect(bData!.pages[0]!.items[0]!.deletedBySenderAt).toBeNull();
    });
  });

  it('reaction in ConvA → ConvB reactions unaffected', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const aMsg = makeMsg('a-1', CONV_A_ID, { body: 'React to me' });
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_A_KEY,
      { pages: [{ items: [aMsg], nextCursor: null }], pageParams: [null] },
    );
    const bMsg = makeMsg('b-1', CONV_B_ID, {
      body: 'Has own reactions',
      reactions: [{ emoji: '👍' as ReactionEmoji, count: 2, hasMine: false }],
    });
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      CONV_B_KEY,
      { pages: [{ items: [bMsg], nextCursor: null }], pageParams: [null] },
    );

    (supabase.rpc as Mock).mockResolvedValue({
      data: { message_id: 'a-1', user_id: SELF_USER_ID, emoji: '🔥' },
      error: null,
    });

    const { result } = renderHook(
      () => useAddReaction(CONV_A_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await result.current.mutateAsync({
        messageId: 'a-1',
        emoji: '🔥' as ReactionEmoji,
      });
    });

    // ConvB reactions must be unchanged
    await waitFor(() => {
      const bData = getConvData(qc, CONV_B_KEY);
      const bReactions = bData!.pages[0]!.items[0]!.reactions;
      expect(bReactions).toHaveLength(1);
      expect(bReactions![0]!.emoji).toBe('👍');
      expect(bReactions![0]!.count).toBe(2);
    });
  });
});
