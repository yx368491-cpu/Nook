/**
 * M8-4 · Error recovery — network failure → optimistic rollback → cache consistency
 *
 * Tests that when a send/operation fails, the React Query cache is correctly
 * rolled back to its previous state, and subsequent operations still work.
 *
 * Scenarios:
 *   1. Send fails → optimistic bubble removed → cache restored to pre-send state
 *   2. Edit fails → cache rolled back to original body
 *   3. Recall fails → cache rolled back to pre-recall state
 *   4. Delete fails → cache rolled back to pre-delete state
 *   5. One operation fails, another succeeds → correct per-operation state
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
  const rpc = vi.fn(() => Promise.resolve({ data: { id: 'rpc-default' }, error: null }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 'msg-err', created_at: '2026-06-30T12:01:00.000Z' }, error: null })) })),
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
import { useAuth } from '@/stores/useAuth';
import { useUI } from '@/stores/useUI';
import type { MessagesPage, MessageListItem } from '@/lib/api/chat';
import { RECALLED_BODY_SENTINEL } from '@/lib/api/chat';

// ── Constants ────────────────────────────────────────────────────────

const SELF_USER_ID = '11111111-1111-1111-1111-111111111111';
const SELF_EMAIL = 'alice@nook.test';
const CONV_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MSG_ID = 'msg-err-001';
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

function findMessage(qc: QueryClient, msgId: string): MessageListItem | undefined {
  return getMessages(qc).find((m) => m.id === msgId);
}

function mockRestInsertResolve(payload: unknown) {
  (supabase.from as Mock).mockReturnValue({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: payload, error: null }),
      })),
    })),
    select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })) })),
    delete: vi.fn(),
    eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ session: null, profile: null, isInitialized: false, isLoading: false, error: null });
  useUI.setState({ sidebarOpen: true, selectedConversationId: null });
  seedAuth();
});

// ── Tests ────────────────────────────────────────────────────────────

describe('M8-4 · Error recovery — network failure → optimistic rollback → consistency', () => {

  it('send fails → cache rolls back to pre-send state (empty cache)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    seedMessagesCache(qc, []);

    // Mock REST INSERT to FAIL
    mockRestInsertResolve(null);
    (supabase.from as Mock).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'NETWORK_DOWN', code: 'NETWORK_ERROR' } }),
        })),
      })),
      select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })) })),
      delete: vi.fn(),
      eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
    });

    const { result } = renderHook(
      () => useSendTextMessage(CONV_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({
          body: 'This should fail',
          replyToId: null,
          clientMsgId: 'fail-cmid-1',
        });
      } catch {
        // Expected to fail
      }
    });

    // Cache should be rolled back — no messages
    await waitFor(() => {
      const items = getMessages(qc);
      expect(items.length).toBe(0);
    });
  });

  it('edit fails → cache rolls back to original body', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const originalBody = 'Original text';
    const msg: MessageListItem = {
      id: MSG_ID, conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: originalBody,
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: 'edit-cmid',
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    };
    seedMessagesCache(qc, [msg]);

    // Mock RPC to FAIL for edit
    (supabase.rpc as Mock).mockRejectedValue({ message: 'E_MSG_EDIT_FORBIDDEN: not_owner' });

    const { result } = renderHook(
      () => useEditMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({ messageId: MSG_ID, newBody: 'Should not apply' });
      } catch {
        // Expected
      }
    });

    // Cache should be rolled back
    await waitFor(() => {
      const m = findMessage(qc, MSG_ID);
      expect(m?.body).toBe(originalBody);
      expect(m?.editedAt).toBeNull();
    });
  });

  it('recall fails → cache rolls back to pre-recall state', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const msg: MessageListItem = {
      id: MSG_ID, conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Recall me',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: 'recall-cmid',
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    };
    seedMessagesCache(qc, [msg]);

    // Mock RPC to FAIL for recall
    (supabase.rpc as Mock).mockRejectedValue({ message: 'E_MSG_RECALL_FORBIDDEN: window_expired' });

    const { result } = renderHook(
      () => useRecallMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({ messageId: MSG_ID });
      } catch {
        // Expected
      }
    });

    // Cache should be rolled back
    await waitFor(() => {
      const m = findMessage(qc, MSG_ID);
      expect(m?.body).toBe('Recall me');
      expect(m?.recalledAt).toBeNull();
    });
  });

  it('delete fails → cache rolls back to pre-delete state', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const msg: MessageListItem = {
      id: MSG_ID, conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Delete me',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: 'delete-cmid',
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    };
    seedMessagesCache(qc, [msg]);

    // Mock RPC to FAIL for delete
    (supabase.rpc as Mock).mockRejectedValue({ message: 'E_MSG_DELETE_FORBIDDEN: window_expired' });

    const { result } = renderHook(
      () => useDeleteMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({ messageId: MSG_ID });
      } catch {
        // Expected
      }
    });

    // Cache should be rolled back
    await waitFor(() => {
      const m = findMessage(qc, MSG_ID);
      expect(m?.deletedBySenderAt).toBeNull();
    });
  });

  it('one operation fails, another succeeds → both caches consistent independently', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const msgA: MessageListItem = {
      id: 'msg-a', conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Message A',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: 'cmid-a',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
    };
    const msgB: MessageListItem = {
      id: 'msg-b', conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Message B',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: 'cmid-b',
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    };
    seedMessagesCache(qc, [msgA, msgB]);

    // ── Edit msgA: FAIL ──
    (supabase.rpc as Mock).mockRejectedValueOnce({ message: 'E_MSG_EDIT_FORBIDDEN: window_expired' });

    const { result: editResult } = renderHook(
      () => useEditMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      try { await editResult.current.mutateAsync({ messageId: 'msg-a', newBody: 'Should not apply' }); }
      catch { /* expected */ }
    });

    await waitFor(() => {
      expect(findMessage(qc, 'msg-a')?.body).toBe('Message A');
    });

    // ── Edit msgB: SUCCEED ──
    (supabase.rpc as Mock).mockResolvedValueOnce({
      data: { id: 'msg-b', body: 'Message B edited', edited_at: '2026-06-30T12:05:00.000Z' },
      error: null,
    });

    await act(async () => {
      await editResult.current.mutateAsync({ messageId: 'msg-b', newBody: 'Message B edited' });
    });

    await waitFor(() => {
      const m = findMessage(qc, 'msg-b');
      expect(m?.body).toBe('Message B edited');
      expect(m?.editedAt).not.toBeNull();
    });

    // Final verification: msgA unchanged, msgB edited
    expect(findMessage(qc, 'msg-a')?.body).toBe('Message A');
    const mB = findMessage(qc, 'msg-b');
    expect(mB?.body).toBe('Message B edited');
    expect(mB?.editedAt).not.toBeNull();
  });
});
