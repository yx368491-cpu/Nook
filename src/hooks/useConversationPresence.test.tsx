import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConversationPresence } from './useConversationPresence';
import { usePresence } from '@/stores/usePresence';
import { useAuth } from '@/stores/useAuth';

// ===========================================================================
// Module-level mocks
// ===========================================================================
//
// Mock `@/lib/realtime/conversationChannel` so the test can capture the
// `handlers` passed to `subscribePresenceEvents` and invoke `onSync`
// deterministically. We don't go through the real supabase-js channel
// stack — production paths are exercised by integration / staging smoke
// tests, not unit tests.
vi.mock('@/lib/realtime/conversationChannel', () => ({
  subscribePresenceEvents: vi.fn(() => () => undefined),
}));

import { subscribePresenceEvents } from '@/lib/realtime/conversationChannel';
import type { PresenceChannelHandlers } from '@/lib/realtime/conversationChannel';

// ===========================================================================
// Fixtures
// ===========================================================================

const SELF = 'user-self';
const CONV_ID = 'conv-1';
const PEER_A = 'peer-A';
const PEER_B = 'peer-B';
const PEER_C = 'peer-C';

/**
 * Re-install the `subscribePresenceEvents` mock per-test so the captured
 * handlers dict is fresh and not leaked across tests.
 *
 * Returns a `getHandlers()` accessor that, after the hook has mounted,
 * yields the `{ onSync, onJoin, onLeave }` object the hook passed in.
 */
function captureHandlers() {
  let captured: PresenceChannelHandlers | undefined;
  (subscribePresenceEvents as Mock).mockImplementation(
    (_convId: string, handlers: PresenceChannelHandlers) => {
      captured = handlers;
      return () => undefined;
    },
  );
  return () => captured!;
}

function seedAuth() {
  useAuth.setState({
    session: {
      accessToken: 'test-access-token',
      user: { id: SELF, email: 'self@nook.test' },
    },
    profile: {
      id: SELF,
      displayName: 'Self',
      avatarUrl: null,
      role: 'owner',
      language: 'en',
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  });
}

function makeWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <>{children}</>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Zustand singletons — reset before each test so isolation holds.
  useAuth.setState({
    session: null,
    profile: null,
    isInitialized: true,
    isLoading: false,
    error: null,
  });
  seedAuth();
  usePresence.setState({
    onlineUsers: new Map(),
    typingUsers: new Map(),
  });
});

// ===========================================================================
// Tests — online state (M4-8 / F-ST-01 / AC.11)
// ===========================================================================

describe('useConversationPresence — onSync writes BOTH online + typing', () => {
  it('writes online peers (online=true && has user_id) to onlineUsers[convId] as a Set', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useConversationPresence({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    expect(handlers).toBeDefined();

    act(() => {
      handlers.onSync?.([
        { user_id: PEER_A, online: true, typing: false },
        { user_id: PEER_B, online: true, typing: true },
      ]);
    });

    expect(usePresence.getState().onlineUsers.get(CONV_ID)).toEqual(
      new Set([PEER_A, PEER_B]),
    );
    expect(subscribePresenceEvents).toHaveBeenCalledTimes(1);
    expect(subscribePresenceEvents).toHaveBeenCalledWith(
      CONV_ID,
      expect.objectContaining({ onSync: expect.any(Function) }),
    );
  });

  it('excludes own user_id from online peers (self-actor gate, M4-7 lesson)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useConversationPresence({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        { user_id: SELF, online: true, typing: true },
        { user_id: PEER_B, online: true, typing: false },
      ]);
    });

    const onlineSet = usePresence.getState().onlineUsers.get(CONV_ID);
    expect(onlineSet).toEqual(new Set([PEER_B]));
    expect(onlineSet?.has(SELF)).toBe(false);
  });

  it('drops online=false rows (peers that left the channel)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useConversationPresence({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        // @ts-expect-error — intentional: exercises the online=false filter
        { user_id: PEER_A, online: false, typing: false },
        { user_id: PEER_B, online: true, typing: false },
      ]);
    });

    expect(usePresence.getState().onlineUsers.get(CONV_ID)).toEqual(
      new Set([PEER_B]),
    );
  });

  it('drops rows with empty user_id (defensive schema sanity)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useConversationPresence({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        // empty user_id is intended valid-string mom but our filter rejects it.
        // No `@ts-expect-error` needed — `online: true` matches the literal.
        { user_id: '', online: true, typing: false },
        { user_id: PEER_A, online: true, typing: false },
      ]);
    });

    expect(usePresence.getState().onlineUsers.get(CONV_ID)).toEqual(
      new Set([PEER_A]),
    );
  });

  it('writes typing peers (typing=true) to typingUsers[convId] (parallel to online)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useConversationPresence({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        // PEER_A only online, not typing
        { user_id: PEER_A, online: true, typing: false },
        // PEER_B online AND typing
        { user_id: PEER_B, online: true, typing: true },
      ]);
    });

    // typing map: only PEER_B
    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_B]);
    // online map: both PEER_A + PEER_B (typing doesn't disqualify online)
    expect(usePresence.getState().onlineUsers.get(CONV_ID)).toEqual(
      new Set([PEER_A, PEER_B]),
    );
  });

  it('excludes self from typing peers too (same self-actor chain as online)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useConversationPresence({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        { user_id: SELF, online: true, typing: true },
        { user_id: PEER_B, online: true, typing: true },
      ]);
    });

    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_B]);
  });
});

// ===========================================================================
// Tests — mount / unmount lifecycle
// ===========================================================================

describe('useConversationPresence — unmount cleanup', () => {
  it('clears BOTH online + typing slice for the convId on unmount', () => {
    const getHandlers = captureHandlers();
    const { unmount } = renderHook(
      () => useConversationPresence({ conversationId: CONV_ID }),
      { wrapper: makeWrapper() },
    );

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        { user_id: PEER_A, online: true, typing: true },
      ]);
    });
    // Pre-condition: BOTH maps have CONV_ID entry
    expect(usePresence.getState().onlineUsers.get(CONV_ID)).toEqual(
      new Set([PEER_A]),
    );
    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_A]);

    act(() => {
      unmount();
    });

    // Post-condition: both maps have CONV_ID DELETED entirely (via clearConv)
    expect(usePresence.getState().onlineUsers.has(CONV_ID)).toBe(false);
    expect(usePresence.getState().typingUsers.has(CONV_ID)).toBe(false);
  });

  it('does NOT touch unrelated convIds when cleaning up', () => {
    const getHandlers = captureHandlers();
    const { unmount } = renderHook(
      () => useConversationPresence({ conversationId: CONV_ID }),
      { wrapper: makeWrapper() },
    );

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        { user_id: PEER_A, online: true, typing: false },
      ]);
    });
    // Pre-seed an unrelated conv so we can verify it survives unmount.
    act(() => {
      usePresence.getState().setOnlineUsersForConv('other-conv', [PEER_B]);
      usePresence.getState().setTypingUsers('other-conv', [PEER_B]);
    });

    act(() => {
      unmount();
    });

    expect(usePresence.getState().onlineUsers.has(CONV_ID)).toBe(false);
    expect(usePresence.getState().typingUsers.has(CONV_ID)).toBe(false);
    // The unrelated conv survives intact.
    expect(usePresence.getState().onlineUsers.get('other-conv')).toEqual(
      new Set([PEER_B]),
    );
    expect(usePresence.getState().typingUsers.get('other-conv')).toEqual([
      PEER_B,
    ]);
  });
});

// ===========================================================================
// Tests — conversationId switching (room flip)
// ===========================================================================

describe('useConversationPresence — re-subscribe on conversationId change', () => {
  it('clears the previous convId rows when switching rooms', () => {
    const getHandlers = captureHandlers();
    const { rerender } = renderHook(
      ({ conversationId }) =>
        useConversationPresence({ conversationId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID },
      },
    );

    // Capture handlers for the initial conversation
    const handlers1 = getHandlers();
    act(() => {
      handlers1.onSync?.([{ user_id: PEER_A, online: true, typing: true }]);
    });
    expect(usePresence.getState().onlineUsers.get(CONV_ID)).toEqual(
      new Set([PEER_A]),
    );
    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_A]);

    // Switch rooms — the previous effect closure's cleanup runs, then a
    // new subscribe fires with the new convId.
    act(() => {
      rerender({ conversationId: 'conv-2' });
    });

    // OLD convId rows cleared.
    expect(usePresence.getState().onlineUsers.has(CONV_ID)).toBe(false);
    expect(usePresence.getState().typingUsers.has(CONV_ID)).toBe(false);
    // The NEW convId's onSync handler is a fresh closure.
    const handlers2 = getHandlers();
    act(() => {
      handlers2.onSync?.([{ user_id: PEER_B, online: true, typing: false }]);
    });
    expect(usePresence.getState().onlineUsers.get('conv-2')).toEqual(
      new Set([PEER_B]),
    );
    // PEER_B is online but not typing → typingUsers[conv-2] was written with
    // empty array (key PRESENT, value EMPTY). Asserting via `.get(...)` not
    // `.has(...)` because `setTypingUsers` always writes the key on sync.
    expect(usePresence.getState().typingUsers.get('conv-2')).toEqual([]);
  });
});
