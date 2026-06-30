/**
 * M8 · Chat Core Integration Test Helpers
 *
 * Shared mock setup, test data, and utility functions for the 5 static
 * integration test files that verify cross-hook data flow through the
 * React Query cache + Zustand stores.
 *
 * All tests mock at the `@/lib/supabase` layer (same pattern as existing
 * unit tests) and use a SINGLE shared QueryClient so cache propagation
 * between hooks is real — this is the "integration" guarantee.
 */

import type { ReactNode } from 'react';
import { vi, type Mock } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/stores/useAuth';
import { useUI } from '@/stores/useUI';
import { useChat } from '@/stores/useChat';
import type {
  ConversationListItem,
  MessageListItem,
  MessagesPage,
} from '@/lib/api/chat';

// ════════════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════════════

export const SELF_USER_ID = '11111111-1111-1111-1111-111111111111';
export const SELF_EMAIL = 'alice@nook.test';
export const SELF_DISPLAY_NAME = 'Alice';

export const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';
export const OTHER_EMAIL = 'bob@nook.test';
export const OTHER_DISPLAY_NAME = 'Bob';

export const CONV_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const CONV_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

export const DEFAULT_NOW = '2026-06-30T12:00:00.000Z';

// ════════════════════════════════════════════════════════════════════════
// Mock factory: returns a fresh supabase mock object
// ════════════════════════════════════════════════════════════════════════

/**
 * Build a fresh mock supabase object. Each test file should call this at
 * module top inside its `vi.mock('@/lib/supabase', factory)` call, or
 * define its own mock inline.
 *
 * Default behavior:
 *   - `rpc` resolves to `{ id: 'rpc-default', created_at: <now> }`
 *   - `from('*').insert().select().single()` resolves to
 *     `{ id: 'from-default', created_at: <now> }`
 *   - `from('*').select(...)` resolves to `{ data: null, error: null }`
 *   - `from('*').update(...)` / `from('*').delete(...)` chain resolves empty
 *   - `channel` / `removeChannel` are no-ops
 *   - `auth.onAuthStateChange` returns unsubscribable stub
 */
export function createMockSupabase() {
  const single = vi.fn(() =>
    Promise.resolve({ data: null, error: null }),
  );
  const select = vi.fn(() => ({ single, data: null, error: null }));
  const eq = vi.fn(() => ({ single, select, data: null, error: null }));
  const is = vi.fn(() => ({ single, select, data: null, error: null }));
  const order = vi.fn(() => ({ single, select, eq, is, data: null, error: null }));
  const limit = vi.fn(() => ({ single, select, eq, is, order, data: null, error: null }));
  const filter = vi.fn(() => ({ single, select, eq, is, order, limit, data: null, error: null }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 'from-default', created_at: DEFAULT_NOW }, error: null })) })),
  }));
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ select, single })) }));
  const removeFn = vi.fn(() => Promise.resolve({ data: null, error: null }));

  return {
    supabase: {
      rpc: vi.fn(() =>
        Promise.resolve({
          data: { id: 'rpc-default', created_at: DEFAULT_NOW },
          error: null,
        }),
      ),
      from: vi.fn(() => ({
        insert,
        select,
        update,
        delete: removeFn,
        eq,
        is,
        order,
        limit,
        filter,
        single,
      })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
        track: vi.fn(),
        presenceState: vi.fn(() => ({})),
      })),
      removeChannel: vi.fn(),
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        getSession: vi.fn(() =>
          Promise.resolve({
            data: { session: null },
            error: null,
          }),
        ),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
          createSignedUrl: vi.fn(),
          list: vi.fn(),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
        })),
      },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════
// Auth store seeding
// ════════════════════════════════════════════════════════════════════════

export function seedAuth(
  overrides?: {
    userId?: string;
    email?: string;
    displayName?: string;
    role?: 'owner' | 'friend';
  },
) {
  const uid = overrides?.userId ?? SELF_USER_ID;
  const email = overrides?.email ?? SELF_EMAIL;
  useAuth.setState({
    session: { accessToken: 'test-access-token', user: { id: uid, email } },
    profile: {
      id: uid,
      displayName: overrides?.displayName ?? SELF_DISPLAY_NAME,
      avatarUrl: null,
      role: overrides?.role ?? 'owner',
      language: 'en',
      lastSeenAt: null,
      createdAt: DEFAULT_NOW,
    },
    isInitialized: true,
    isLoading: false,
    error: null,
  });
}

export function resetAllStores() {
  useAuth.setState({
    session: null,
    profile: null,
    isInitialized: false,
    isLoading: false,
    error: null,
    isUploadingAvatar: false,
  });
  useUI.setState({
    sidebarOpen: true,
    selectedConversationId: null,
  });
  useChat.setState({
    replyingTo: null,
  });
}

// ════════════════════════════════════════════════════════════════════════
// QueryClient helpers
// ════════════════════════════════════════════════════════════════════════

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ════════════════════════════════════════════════════════════════════════
// Test data builders
// ════════════════════════════════════════════════════════════════════════

export function makeMessagesPage(
  items: MessageListItem[],
  nextCursor: string | null = null,
): MessagesPage {
  return { items, nextCursor };
}

export function makeConversationListItem(
  overrides: Partial<ConversationListItem> & { id: string; title: string },
): ConversationListItem {
  return {
    id: overrides.id,
    kind: overrides.kind ?? 'direct',
    title: overrides.title,
    avatarUrl: overrides.avatarUrl ?? null,
    lastActivityAt: overrides.lastActivityAt ?? DEFAULT_NOW,
    members: overrides.members ?? [
      { userId: SELF_USER_ID, displayName: SELF_DISPLAY_NAME, avatarUrl: null, role: 'owner' },
    ],
    lastMessage: overrides.lastMessage ?? null,
    unreadCount: overrides.unreadCount ?? 0,
  };
}

export function makeMessageListItem(
  overrides: Partial<MessageListItem> & { id: string; clientMsgId: string },
): MessageListItem {
  return {
    id: overrides.id,
    conversationId: overrides.conversationId ?? CONV_A_ID,
    senderId: overrides.senderId ?? SELF_USER_ID,
    senderName: overrides.senderName ?? SELF_DISPLAY_NAME,
    senderAvatarUrl: overrides.senderAvatarUrl ?? null,
    isSelf: overrides.isSelf ?? true,
    kind: overrides.kind ?? 'text',
    body: overrides.body ?? 'Hello, world!',
    attachment: overrides.attachment ?? null,
    replyToId: overrides.replyToId ?? null,
    replyTo: overrides.replyTo ?? null,
    editedAt: overrides.editedAt ?? null,
    recalledAt: overrides.recalledAt ?? null,
    deletedBySenderAt: overrides.deletedBySenderAt ?? null,
    reactions: overrides.reactions ?? [],
    clientMsgId: overrides.clientMsgId,
    createdAt: overrides.createdAt ?? DEFAULT_NOW,
  };
}

/**
 * Guide: tool to set up a `supabase.from().select()` chain that returns
 * a specific value. Each call stacks a new mock return value on the
 * chain functions.
 */
export function mockSelectResolves(supabase: { from: Mock }, data: unknown) {
  const single = vi.fn().mockResolvedValue({ data, error: null });
  (supabase.from as Mock).mockReturnValueOnce({
    select: vi.fn(() => ({ single, data, error: null })),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    filter: vi.fn(),
  });
}
