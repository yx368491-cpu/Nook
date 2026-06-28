import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEditMessage } from './useEditMessage';
import { useAuth } from '@/stores/useAuth';
import {
  MessageEditError,
  type MessagesPage,
  type MessageListItem,
} from '@/lib/api/chat';

// ===========================================================================
// Module-level mocks
// ===========================================================================
//
// We fully stub `@/lib/supabase` so the real `createClient(...)` in
// `src/lib/supabase.ts` never runs. Vitest hoists `vi.mock` above the
// static-import block, so every subsequent `import` of `supabase`
// (including transitive ones through `useAuth → authApi → supabase`)
// receives this stub.
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

// ===========================================================================
// Setup / teardown
// ===========================================================================

beforeEach(() => {
  vi.clearAllMocks();
  // Zustand store is a top-level singleton — reset before every test so
  // isolation holds. Seed the auth so useAuth selectors resolve to SELF_USER_ID.
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

describe('useEditMessage — optimistic UI flow', () => {
  describe('onMutate: cache is patched before mutation resolves', () => {
    it('replaces the target message body and stamps editedAt with an ISO timestamp', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [
        makeMessagesPage([
          makeMessage({ id: TARGET_MSG_ID, body: 'Original' }),
          makeMessage({ id: OTHER_MSG_ID, body: 'Unrelated' }),
        ]),
      ]);

      // Promise that never resolves — simulates a slow RPC so we can
      // observe the optimistic cache patch in the steady-state in-flight window.
      (supabase.rpc as Mock).mockImplementation(
        () => new Promise<never>(() => {}),
      );

      const { result } = renderHook(() => useEditMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate({
          messageId: TARGET_MSG_ID,
          newBody: 'Edited body',
        });
      });

      // Wait for the patch to land (mutation is in-flight but onMutate ran sync).
      await waitFor(() => {
        const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(
          MESSAGES_QUERY_KEY,
        );
        const target = data?.pages[0]?.items.find((m) => m.id === TARGET_MSG_ID);
        expect(target?.body).toBe('Edited body');
      });

      const dataAfter = qc.getQueryData<
        InfiniteData<MessagesPage, string | null>
      >(MESSAGES_QUERY_KEY);

      const targetAfter = dataAfter!.pages[0]!.items.find(
        (m) => m.id === TARGET_MSG_ID,
      )!;
      // Optimistic editedAt ISO-formatted, valid date
      expect(targetAfter.editedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
      expect(Number.isNaN(Date.parse(targetAfter.editedAt!))).toBe(false);

      // Untouched message still intact
      const otherAfter = dataAfter!.pages[0]!.items.find(
        (m) => m.id === OTHER_MSG_ID,
      )!;
      expect(otherAfter.body).toBe('Unrelated');
      expect(otherAfter.editedAt).toBeNull();
    });

    it('does not throw when no cache exists yet (previous === undefined)', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      // Intentionally do NOT seed the cache.

      (supabase.rpc as Mock).mockResolvedValue({
        data: {
          id: TARGET_MSG_ID,
          body: 'Edited body',
          edited_at: '2026-06-28T12:30:00.000Z',
        },
        error: null,
      });

      const { result } = renderHook(() => useEditMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate({
          messageId: TARGET_MSG_ID,
          newBody: 'Edited body',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.body).toBe('Edited body');
    });
  });

  describe('onError: rolls back to pre-mutation snapshot', () => {
    it('restores original body + null editedAt after WINDOW_EXPIRED rejection', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [
        makeMessagesPage([
          makeMessage({ id: TARGET_MSG_ID, body: 'Original' }),
        ]),
      ]);

      // Mirror the exact `fn_edit_message` raise format so
      // `mapEditErrorCode` lands on WINDOW_EXPIRED.
      (supabase.rpc as Mock).mockResolvedValue({
        data: null,
        error: {
          message: 'E_MSG_EDIT_FORBIDDEN: window_expired',
          details: null,
          hint: null,
          code: 'P0001',
        },
      });

      const onErrorSpy = vi.fn();
      const { result } = renderHook(() => useEditMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate(
          { messageId: TARGET_MSG_ID, newBody: 'Edited body' },
          { onError: onErrorSpy },
        );
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Passed-through onError receives the MessageEditError with code WINDOW_EXPIRED
      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      const thrown = onErrorSpy.mock.calls[0]![0] as MessageEditError;
      expect(thrown).toBeInstanceOf(MessageEditError);
      expect(thrown.code).toBe('WINDOW_EXPIRED');

      // Rollback: snapshot restored verbatim
      const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(
        MESSAGES_QUERY_KEY,
      );
      const target = data!.pages[0]!.items.find((m) => m.id === TARGET_MSG_ID)!;
      expect(target.body).toBe('Original');
      expect(target.editedAt).toBeNull();
    });

    it('leaves NO lossy mutation state when error fires', async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      seedQueryCache(qc, [
        makeMessagesPage([
          makeMessage({ id: TARGET_MSG_ID, body: 'Pre-edit text' }),
        ]),
      ]);

      (supabase.rpc as Mock).mockResolvedValue({
        data: null,
        error: { message: 'E_MSG_EDIT_FORBIDDEN: not_owner' },
      });

      const { result } = renderHook(() => useEditMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate({
          messageId: TARGET_MSG_ID,
          newBody: 'Hacker attempt',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      const data = qc.getQueryData<InfiniteData<MessagesPage, string | null>>(
        MESSAGES_QUERY_KEY,
      );
      // Reference equality: restored snapshot === pre-mutation cache
      expect(data?.pages[0]?.items[0]?.body).toBe('Pre-edit text');
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
          body: 'Edited body',
          edited_at: '2026-06-28T12:30:00.000Z',
        },
        error: null,
      });

      const { result } = renderHook(() => useEditMessage(CONV_ID), {
        wrapper: makeWrapper(qc),
      });

      act(() => {
        result.current.mutate({
          messageId: TARGET_MSG_ID,
          newBody: 'Edited body',
        });
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
