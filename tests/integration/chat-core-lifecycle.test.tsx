/**
 * M8-2 · Message lifecycle — send → edit → recall → delete
 *
 * Tests the full lifecycle of a message through all four mutation hooks,
 * verifying that each operation correctly updates the shared React Query
 * cache and that subsequent operations see the correct state.
 *
 * KEY NOTE: `useSendTextMessage` uses `['messages', conversationId]`
 * (WITHOUT userId), while `useEditMessage` / `useRecallMessage` /
 * `useDeleteMessage` use `['messages', userId, conversationId]` (WITH userId).
 * The lifecycle test seeds the correct key per operation step.
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
      data: { id: 'rpc-default', edited_at: '2026-06-30T12:02:00.000Z' },
      error: null,
    }),
  );
  const single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 'msg-lifecycle', created_at: '2026-06-30T12:01:00.000Z' }, error: null })) })),
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
const MSG_ID = 'msg-001';
const CLIENT_MSG_ID = 'cmid-lifecycle';
const DEFAULT_NOW = '2026-06-30T12:00:00.000Z';

// useSendTextMessage uses ['messages', conversationId] (no userId)
const SEND_KEY = ['messages', CONV_ID] as const;
// useEditMessage/useRecallMessage/useDeleteMessage use ['messages', userId, conversationId]
const CACHE_KEY = ['messages', SELF_USER_ID, CONV_ID] as const;

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
    CACHE_KEY,
    { pages: [{ items, nextCursor: null }], pageParams: [null] },
  );
}

function getMessages(qc: QueryClient): MessageListItem[] {
  const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(CACHE_KEY);
  return data?.pages[0]?.items?.slice() ?? [];
}

function findMessage(qc: QueryClient, msgId: string): MessageListItem | undefined {
  return getMessages(qc).find((m) => m.id === msgId);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ session: null, profile: null, isInitialized: false, isLoading: false, error: null });
  useUI.setState({ sidebarOpen: true, selectedConversationId: null });
  seedAuth();
});

// ── Tests ────────────────────────────────────────────────────────────

describe('M8-2 · Message lifecycle — send → edit → recall → delete', () => {

  it('STEP 1: send a text message → appears in send-hook cache', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    // Seed send-hook key ['messages', convId]
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      SEND_KEY,
      { pages: [{ items: [], nextCursor: null }], pageParams: [null] },
    );

    // Mock REST INSERT success
    (supabase.from as Mock).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: MSG_ID, created_at: '2026-06-30T12:01:00.000Z' }, error: null })),
        })),
      })),
      select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })) })),
      delete: vi.fn(),
      eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
    });

    const { result: sendResult } = renderHook(
      () => useSendTextMessage(CONV_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await sendResult.current.mutateAsync({
        body: 'Hello from Alice',
        replyToId: null,
        clientMsgId: CLIENT_MSG_ID,
      });
    });

    // Check send-hook key for optimistic/real message
    await waitFor(() => {
      const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(SEND_KEY);
      expect(data!.pages[0]!.items.length).toBeGreaterThan(0);
    });
  });

  it('STEP 2: edit message body → cache reflects new body and editedAt', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const msgInWindow: MessageListItem = {
      id: MSG_ID, conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Hello from Alice',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: CLIENT_MSG_ID,
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    };
    seedMessagesCache(qc, [msgInWindow]);

    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: MSG_ID, body: 'Edited message', edited_at: '2026-06-30T12:02:00.000Z' },
      error: null,
    });

    const { result: editResult } = renderHook(
      () => useEditMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await editResult.current.mutateAsync({ messageId: MSG_ID, newBody: 'Edited message' });
    });

    await waitFor(() => {
      const updated = findMessage(qc, MSG_ID);
      expect(updated).toBeDefined();
      expect(updated!.body).toBe('Edited message');
      expect(updated!.editedAt).not.toBeNull();
    });
  });

  it('STEP 3: recall message → cache shows recalledAt and body sentinel', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const msgRecallable: MessageListItem = {
      id: MSG_ID, conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Message to recall',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: CLIENT_MSG_ID,
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    };
    seedMessagesCache(qc, [msgRecallable]);

    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: MSG_ID, recalled_at: '2026-06-30T12:03:00.000Z' },
      error: null,
    });

    const { result: recallResult } = renderHook(
      () => useRecallMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await recallResult.current.mutateAsync({ messageId: MSG_ID });
    });

    await waitFor(() => {
      const updated = findMessage(qc, MSG_ID);
      expect(updated).toBeDefined();
      expect(updated!.recalledAt).not.toBeNull();
      expect(updated!.body).toBe(RECALLED_BODY_SENTINEL);
    });
  });

  it('STEP 4: delete message → cache shows deletedBySenderAt', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const msgDeletable: MessageListItem = {
      id: MSG_ID, conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Message to delete',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: CLIENT_MSG_ID,
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    };
    seedMessagesCache(qc, [msgDeletable]);

    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: MSG_ID, deleted_at: '2026-06-30T12:04:00.000Z' },
      error: null,
    });

    const { result: deleteResult } = renderHook(
      () => useDeleteMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await deleteResult.current.mutateAsync({ messageId: MSG_ID });
    });

    await waitFor(() => {
      const updated = findMessage(qc, MSG_ID);
      expect(updated).toBeDefined();
      expect(updated!.deletedBySenderAt).not.toBeNull();
    });
  });

  it('FULL CYCLE: send → edit → recall → delete with cache state verification', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    // ── 1. Send (uses ['messages', convId] key) ──
    qc.setQueryData<InfiniteData<MessagesPage, string | null>>(
      SEND_KEY,
      { pages: [{ items: [], nextCursor: null }], pageParams: [null] },
    );

    (supabase.from as Mock).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: MSG_ID, created_at: '2026-06-30T12:01:00.000Z' }, error: null })),
        })),
      })),
      select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })) })),
      delete: vi.fn(),
      eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
    });

    const { result: sendResult } = renderHook(
      () => useSendTextMessage(CONV_ID, SELF_USER_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await sendResult.current.mutateAsync({
        body: 'Original text', replyToId: null, clientMsgId: CLIENT_MSG_ID,
      });
    });

    // ── 2. Edit (uses ['messages', userId, convId] key) ──
    const canonicalMsg: MessageListItem = {
      id: MSG_ID, conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Original text',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: null, recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: CLIENT_MSG_ID,
      createdAt: new Date(Date.now() - 30_000).toISOString(),
    };
    seedMessagesCache(qc, [canonicalMsg]);

    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: MSG_ID, body: 'Edited text', edited_at: '2026-06-30T12:02:00.000Z' },
      error: null,
    });

    const { result: editResult } = renderHook(
      () => useEditMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await editResult.current.mutateAsync({ messageId: MSG_ID, newBody: 'Edited text' });
    });

    await waitFor(() => {
      const m = findMessage(qc, MSG_ID);
      expect(m?.body).toBe('Edited text');
      expect(m?.editedAt).not.toBeNull();
    });

    // ── 3. Recall ──
    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: MSG_ID, recalled_at: '2026-06-30T12:03:00.000Z' },
      error: null,
    });

    const { result: recallResult } = renderHook(
      () => useRecallMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await recallResult.current.mutateAsync({ messageId: MSG_ID });
    });

    await waitFor(() => {
      const m = findMessage(qc, MSG_ID);
      expect(m?.recalledAt).not.toBeNull();
      expect(m?.body).toBe(RECALLED_BODY_SENTINEL);
    });

    // ── 4. Delete ──
    (supabase.rpc as Mock).mockResolvedValue({
      data: { id: MSG_ID, deleted_at: '2026-06-30T12:04:00.000Z' },
      error: null,
    });

    const { result: deleteResult } = renderHook(
      () => useDeleteMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      await deleteResult.current.mutateAsync({ messageId: MSG_ID });
    });

    await waitFor(() => {
      const m = findMessage(qc, MSG_ID);
      expect(m?.deletedBySenderAt).not.toBeNull();
      expect(m?.recalledAt).not.toBeNull();
    });

    const finalMsg = findMessage(qc, MSG_ID);
    expect(finalMsg).toBeDefined();
    expect(finalMsg!.editedAt).not.toBeNull();
    expect(finalMsg!.recalledAt).not.toBeNull();
    expect(finalMsg!.deletedBySenderAt).not.toBeNull();
  });

  it('edit on already-edited message → server rejects, cache rolls back', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

    const alreadyEdited: MessageListItem = {
      id: MSG_ID, conversationId: CONV_ID, senderId: SELF_USER_ID,
      senderName: 'Alice', senderAvatarUrl: null, isSelf: true,
      kind: 'text', body: 'Already edited',
      attachment: null, replyToId: null, replyTo: null,
      editedAt: '2026-06-30T11:30:00.000Z', recalledAt: null, deletedBySenderAt: null,
      reactions: [], clientMsgId: CLIENT_MSG_ID,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
    };
    seedMessagesCache(qc, [alreadyEdited]);

    // Mock RPC to reject
    (supabase.rpc as Mock).mockRejectedValue({ message: 'E_MSG_EDIT_FORBIDDEN: already_edited_once' });

    const { result: editResult } = renderHook(
      () => useEditMessage(CONV_ID),
      { wrapper: makeWrapper(qc) },
    );

    await act(async () => {
      try { await editResult.current.mutateAsync({ messageId: MSG_ID, newBody: 'Try again' }); }
      catch { /* expected */ }
    });

    await waitFor(() => {
      const m = findMessage(qc, MSG_ID);
      expect(m?.body).toBe('Already edited');
    });
  });
});
