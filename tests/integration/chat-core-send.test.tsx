/**
 * M8-1 · Send message → sidebar preview + ordering update
 *
 * Verifies the cross-hook data flow: when `useSendTextMessage` succeeds,
 * the `['conversations']` cache is invalidated so the sidebar picks up
 * the new lastMessage preview and lastActivityAt ordering.
 *
 * IMPORTANT: `useSendTextMessage` uses `['messages', conversationId]`
 * (WITHOUT userId in the key), while `useInfiniteMessages` / edit/recall/
 * delete hooks use `['messages', userId, conversationId]` (WITH userId).
 * This test seeds the send-hook's key `['messages', CONV_A_ID]`.
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
  const rpc = vi.fn(() =>
    Promise.resolve({
      data: { id: 'rpc-default', created_at: '2026-06-30T12:00:00.000Z' },
      error: null,
    }),
  );
  const single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ single }));
  const is = vi.fn(() => ({ single }));
  const order = vi.fn(() => ({ single, select }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() =>
        Promise.resolve({
          data: { id: 'msg-new', created_at: '2026-06-30T12:01:00.000Z' },
          error: null,
        }),
      ),
    })),
  }));
  return {
    supabase: {
      rpc,
      from: vi.fn(() => ({
        insert, select, update: vi.fn(() => ({ eq: vi.fn(() => ({ select, single })) })),
        delete: vi.fn(), eq, is, order, single,
      })),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() })),
      removeChannel: vi.fn(),
      auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    },
  };
});

import { supabase } from '@/lib/supabase';
import { useSendTextMessage } from '@/hooks/useSendMessage';
import { useAuth } from '@/stores/useAuth';
import { useUI } from '@/stores/useUI';
import type { ConversationListItem, MessagesPage } from '@/lib/api/chat';

// ── Helpers ──────────────────────────────────────────────────────────

const SELF_USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';
const SELF_EMAIL = 'alice@nook.test';
const CONV_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CONV_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DEFAULT_NOW = '2026-06-30T12:00:00.000Z';

// useSendTextMessage uses ['messages', conversationId] (without userId)
const MSGS_KEY_A = ['messages', CONV_A_ID] as const;
const CONVERSATIONS_KEY = ['conversations', SELF_USER_ID] as const;

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

function makeConvRow(overrides: Partial<ConversationListItem> & { id: string; title: string }): ConversationListItem {
  return {
    id: overrides.id,
    kind: overrides.kind ?? 'one_to_one',
    title: overrides.title,
    avatarUrl: null,
    lastActivityAt: overrides.lastActivityAt ?? DEFAULT_NOW,
    members: [{ userId: SELF_USER_ID, displayName: 'Alice', avatarUrl: null, role: 'owner' }],
    lastMessage: overrides.lastMessage ?? null,
    unreadCount: 0,
  };
}

function mockRestInsertResolve(payload: unknown) {
  const single = vi.fn().mockResolvedValue({ data: payload, error: null });
  (supabase.from as Mock).mockReturnValue({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ single })),
    })),
    select: vi.fn(() => ({ single })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) })),
    delete: vi.fn(),
    eq: vi.fn(() => ({ single })),
    is: vi.fn(() => ({ single })),
    order: vi.fn(() => ({ single })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ session: null, profile: null, isInitialized: false, isLoading: false, error: null });
  useUI.setState({ sidebarOpen: true, selectedConversationId: null });
  seedAuth();
});

// ── Tests ────────────────────────────────────────────────────────────

describe('M8-1 · Send message → sidebar preview + ordering', () => {

  it('send message → conversations cache isInvalidated after successful send', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
    });

    // Seed conversations cache
    qc.setQueryData<ConversationListItem[]>(CONVERSATIONS_KEY, []);
    // Seed empty messages cache for ConvA (send-hook key: ['messages', convId])
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      MSGS_KEY_A,
      { pages: [{ items: [], nextCursor: null }], pageParams: [null] },
    );

    mockRestInsertResolve({ id: 'msg-1', created_at: '2026-06-30T12:01:00.000Z' });

    const { result: sendResult } = renderHook(
      () => useSendTextMessage(CONV_A_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await sendResult.current.mutateAsync({
        body: 'Hey Bob!',
        replyToId: null,
        clientMsgId: 'send-1-cmid',
      });
    });

    // conversations key should be invalidated after send onSuccess
    await waitFor(() => {
      const state = qc.getQueryState(CONVERSATIONS_KEY);
      expect(state?.isInvalidated).toBe(true);
    });
  });

  it('send message → messages cache has data after successful send', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
    });

    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      MSGS_KEY_A,
      { pages: [{ items: [], nextCursor: null }], pageParams: [null] },
    );

    mockRestInsertResolve({ id: 'msg-2', created_at: '2026-06-30T12:02:00.000Z' });

    const { result: sendResult } = renderHook(
      () => useSendTextMessage(CONV_A_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await sendResult.current.mutateAsync({
        body: 'Hello world!',
        replyToId: null,
        clientMsgId: 'send-2-cmid',
      });
    });

    await waitFor(() => {
      const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(MSGS_KEY_A);
      expect(data).toBeDefined();
      expect(data!.pages[0]!.items.length).toBeGreaterThan(0);
    });
  });

  it('send in ConvA does NOT affect ConvB messages cache', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
    });

    // Seed ConvB separately (use the userId-inclusive key for reading)
    const convBKey = ['messages', SELF_USER_ID, CONV_B_ID] as const;
    const convBMsg = {
      id: 'b-msg-1', conversationId: CONV_B_ID, senderId: OTHER_USER_ID,
      senderName: 'Bob', senderAvatarUrl: null, isSelf: false, kind: 'text' as const,
      body: 'Hey from Bob', attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: 'b-cmid-1', createdAt: '2026-06-30T11:00:00.000Z',
    };
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      convBKey,
      { pages: [{ items: [convBMsg], nextCursor: null }], pageParams: [null] },
    );
    // Seed empty ConvA cache (send-hook key)
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      MSGS_KEY_A,
      { pages: [{ items: [], nextCursor: null }], pageParams: [null] },
    );

    mockRestInsertResolve({ id: 'msg-3', created_at: '2026-06-30T12:03:00.000Z' });

    const { result: sendResult } = renderHook(
      () => useSendTextMessage(CONV_A_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await sendResult.current.mutateAsync({
        body: 'Message to A',
        replyToId: null,
        clientMsgId: 'send-3-cmid',
      });
    });

    // ConvB cache should be untouched (no userId key affected)
    const convBCache = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(convBKey);
    expect(convBCache?.pages[0]?.items).toHaveLength(1);
    expect(convBCache?.pages[0]?.items[0]?.id).toBe('b-msg-1');
  });

  it('send message invalidates conversations query', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
    });

    // Must seed conversations cache so the query state exists
    qc.setQueryData<ConversationListItem[]>(CONVERSATIONS_KEY, []);
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      MSGS_KEY_A,
      { pages: [{ items: [], nextCursor: null }], pageParams: [null] },
    );

    mockRestInsertResolve({ id: 'msg-4', created_at: '2026-06-30T12:04:00.000Z' });

    const { result: sendResult } = renderHook(
      () => useSendTextMessage(CONV_A_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

    // Ensure query is fetched (not in initial state)
    qc.setQueryDefaults(CONVERSATIONS_KEY, { staleTime: 0 });

    await act(async () => {
      await sendResult.current.mutateAsync({
        body: 'Bump!',
        replyToId: null,
        clientMsgId: 'send-4-cmid',
      });
    });

    await waitFor(() => {
      const state = qc.getQueryState(CONVERSATIONS_KEY);
      expect(state).toBeDefined();
      expect(state!.isInvalidated).toBe(true);
    });
  });
});
