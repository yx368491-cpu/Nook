import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from '@tanstack/react-query';
import { useDeleteMessage } from './useDeleteMessage';
import { useAuth } from '@/stores/useAuth';
import {
  MessageDeleteError,
  type MessagesPage,
  type MessageListItem,
} from '@/lib/api/chat';

// ===========================================================================
// Module-level mocks
// ===========================================================================
//
// Full module-level stub of `@/lib/supabase` so the real `createClient(...)`
// from `@supabase/supabase-js` never runs in jsdom. The same factory pattern
// as the M4-3 + M4-4 unit tests.
vi.mock('@/lib/supabase', () => {
  const rpc = vi.fn();
  const removeChannel = vi.fn();
  const channel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }));
  return {
    supabase: {
      rpc,
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
// Fixtures
// ===========================================================================

const SELF_USER_ID = '11111111-1111-1111-1111-111111111111';
const SELF_EMAIL = 'alice@nook.test';
const CONV_ID = '22222222-2222-2222-2222-222222222222';
const TARGET_MSG_ID = 'msg-target';
const OTHER_MSG_ID = 'msg-other';

function makeMessage(over: Partial<MessageListItem> = {}): MessageListItem {
  return {
    id: TARGET_MSG_ID,
    conversationId: CONV_ID,
    senderId: SELF_USER_ID,
    senderName: 'Alice',
    senderAvatarUrl: null,
    isSelf: true,
    kind: 'text',
    body: 'Original body',
    attachment: null,
    replyToId: null,
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

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({
    session: null,
    profile: null,
    isInitialized: true,
    isLoading: false,
    error: null,
  });
  seedAuth();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('useDeleteMessage — optimistic UI flow', () => {
  describe('onMutate: only deletedBySenderAt is patched; body stays intact', () => {
    it('stamps deletedBySenderAt ISO timestamp without touching body / attachment / recalledAt', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [
        makeMessagesPage([
          makeMessage({ id: TARGET_MSG_ID, body: 'Original text' }),
          makeMessage({
            id: OTHER_MSG_ID,
            senderId: 'someone-else',
            isSelf: false,
            body: 'Unrelated',
          }),
        ]),
      ]);

      (supabase.rpc as Mock).mockImplementation(
        () => new Promise<never>(() => {}),
      );

      const { result } = renderHook(() => useDeleteMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate({ messageId: TARGET_MSG_ID });
      });

      await waitFor(() => {
        const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(
          MESSAGES_QUERY_KEY,
        );
        const target = data?.pages[0]?.items.find((m) => m.id === TARGET_MSG_ID);
        // F-MSG-07: ONLY the sender-side visibility flag changes; the body
        // remains intact so recipient views stay in sync with the row.
        expect(target?.deletedBySenderAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      });

      const dataAfter = qc.getQueryData<
        InfiniteData<MessagesPage, string | null>
      >(MESSAGES_QUERY_KEY);
      const targetAfter = dataAfter!.pages[0]!.items.find(
        (m) => m.id === TARGET_MSG_ID,
      )!;

      // Body + attachment + recalledAt + editedAt stay verbatim
      expect(targetAfter.body).toBe('Original text');
      expect(targetAfter.attachment).toBeNull();
      expect(targetAfter.recalledAt).toBeNull();
      expect(targetAfter.editedAt).toBeNull();
      expect(Number.isNaN(Date.parse(targetAfter.deletedBySenderAt!))).toBe(
        false,
      );

      // Untouched peer message stays intact
      const otherAfter = dataAfter!.pages[0]!.items.find(
        (m) => m.id === OTHER_MSG_ID,
      )!;
      expect(otherAfter.body).toBe('Unrelated');
      expect(otherAfter.deletedBySenderAt).toBeNull();
    });

    it('does not throw when no cache exists yet (previous === undefined)', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      // Intentionally do NOT seed the cache.

      (supabase.rpc as Mock).mockResolvedValue({
        data: {
          id: TARGET_MSG_ID,
          deleted_at: '2026-06-28T12:30:00.000Z',
        },
        error: null,
      });

      const { result } = renderHook(() => useDeleteMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate({ messageId: TARGET_MSG_ID });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.deletedAt).toBe('2026-06-28T12:30:00.000Z');
    });
  });

  describe('onError: rolls back deletedBySenderAt to null', () => {
    it('restores deletedBySenderAt to null + body intact after WINDOW_EXPIRED', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [
        makeMessagesPage([
          makeMessage({ id: TARGET_MSG_ID, body: 'Original text' }),
        ]),
      ]);

      // Mirror the exact `fn_delete_own_message` raise format so
      // `mapDeleteErrorCode` lands on WINDOW_EXPIRED.
      (supabase.rpc as Mock).mockResolvedValue({
        data: null,
        error: {
          message: 'E_MSG_DELETE_FORBIDDEN: window_expired',
          details: null,
          hint: null,
          code: 'P0001',
        },
      });

      const onErrorSpy = vi.fn();
      const { result } = renderHook(() => useDeleteMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate(
          { messageId: TARGET_MSG_ID },
          { onError: onErrorSpy },
        );
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Passed-through onError receives the MessageDeleteError with code WINDOW_EXPIRED
      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      const thrown = onErrorSpy.mock.calls[0]![0] as MessageDeleteError;
      expect(thrown).toBeInstanceOf(MessageDeleteError);
      expect(thrown.code).toBe('WINDOW_EXPIRED');

      // Rollback: snapshot restored verbatim (deletedBySenderAt = null, body=Original text)
      const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(
        MESSAGES_QUERY_KEY,
      );
      const target = data!.pages[0]!.items.find((m) => m.id === TARGET_MSG_ID)!;
      expect(target.body).toBe('Original text');
      expect(target.deletedBySenderAt).toBeNull();
    });

    it('ALREADY_DELETED rollback also restores snapshot', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [
        makeMessagesPage([
          makeMessage({ id: TARGET_MSG_ID, body: 'Still here' }),
        ]),
      ]);

      (supabase.rpc as Mock).mockResolvedValue({
        data: null,
        error: { message: 'E_MSG_DELETE_FORBIDDEN: already_deleted' },
      });

      const { result } = renderHook(() => useDeleteMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate({ messageId: TARGET_MSG_ID });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(
        MESSAGES_QUERY_KEY,
      );
      const target = data!.pages[0]!.items.find((m) => m.id === TARGET_MSG_ID)!;
      expect(target.body).toBe('Still here');
      expect(target.deletedBySenderAt).toBeNull();
    });
  });

  describe('onSuccess: invalidates messages query for server convergence', () => {
    it('calls qc.invalidateQueries with the [messages, userId, convId] key', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [
        makeMessagesPage([
          makeMessage({ id: TARGET_MSG_ID, body: 'Original' }),
        ]),
      ]);

      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

      (supabase.rpc as Mock).mockResolvedValue({
        data: {
          id: TARGET_MSG_ID,
          deleted_at: '2026-06-28T12:30:00.000Z',
        },
        error: null,
      });

      const { result } = renderHook(() => useDeleteMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate({ messageId: TARGET_MSG_ID });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['messages', SELF_USER_ID, CONV_ID],
        }),
      );
    });
  });
});
