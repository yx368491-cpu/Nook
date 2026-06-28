import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingReceivers } from './useTypingReceivers';
import { usePresence } from '@/stores/usePresence';
import { useAuth } from '@/stores/useAuth';

// ===========================================================================
// Module-level mocks
// ===========================================================================
//
// Mock `@/lib/realtime/conversationChannel` directly so the test can capture
// the `handlers` argument passed to `subscribePresenceEvents` and invoke
// `onSync`/`onLeave` deterministically. We don't go through the real
// supabase-js channel stack — the production code path is exercised by
// integration / staging smoke tests, not unit tests.
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
    onlineUsers: new Set(),
    typingUsers: new Map(),
  });
});

// ===========================================================================
// Tests
// ===========================================================================

describe('useTypingReceivers — onSync filter chain', () => {
  it('writes filtered peer ids (typing=true && online=true && has user_id) to usePresence[convId]', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useTypingReceivers({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    expect(handlers).toBeDefined();

    act(() => {
      handlers.onSync?.([
        { user_id: PEER_A, online: true, typing: true },
        { user_id: PEER_B, online: true, typing: true },
      ]);
    });

    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([
      PEER_A,
      PEER_B,
    ]);
    expect(subscribePresenceEvents).toHaveBeenCalledTimes(1);
    expect(subscribePresenceEvents).toHaveBeenCalledWith(
      CONV_ID,
      expect.objectContaining({ onSync: expect.any(Function) }),
    );
  });

  it('excludes own user_id for self-exclusion (peer sees a typing peer, not self)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useTypingReceivers({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        { user_id: SELF, online: true, typing: true },
        { user_id: PEER_B, online: true, typing: true },
      ]);
    });

    const ids = usePresence.getState().typingUsers.get(CONV_ID);
    expect(ids).toEqual([PEER_B]);
    expect(ids).not.toContain(SELF);
  });

  it('drops online=false rows (peers that left the channel)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useTypingReceivers({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        // @ts-expect-error intentional — exercises the online=false filter
        { user_id: PEER_A, online: false, typing: true },
        { user_id: PEER_B, online: true, typing: true },
      ]);
    });

    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_B]);
  });

  it('drops typing=false rows (peers that stopped typing without leaving)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useTypingReceivers({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        { user_id: PEER_A, online: true, typing: false },
        { user_id: PEER_B, online: true, typing: true },
      ]);
    });

    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_B]);
  });

  it('drops rows with empty user_id (defensive)', () => {
    const getHandlers = captureHandlers();
    renderHook(() => useTypingReceivers({ conversationId: CONV_ID }), {
      wrapper: makeWrapper(),
    });

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([
        // @ts-expect-error intentional — exercises the empty-user_id filter
        { user_id: '', online: true, typing: true },
        { user_id: PEER_A, online: true, typing: true },
      ]);
    });

    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_A]);
  });
});

describe('useTypingReceivers — unmount cleanup', () => {
  it('clears typingUsers[conversationId] to empty on unmount', () => {
    const getHandlers = captureHandlers();
    const { unmount } = renderHook(
      () => useTypingReceivers({ conversationId: CONV_ID }),
      { wrapper: makeWrapper() },
    );

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([{ user_id: PEER_A, online: true, typing: true }]);
    });
    // Pre-condition: presence row recorded
    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_A]);

    act(() => {
      unmount();
    });

    // Post-condition: cleared to [] (key kept, set to empty)
    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([]);
  });

  it('clears only the current convId, not other convs', () => {
    const getHandlers = captureHandlers();
    const { unmount } = renderHook(
      () => useTypingReceivers({ conversationId: CONV_ID }),
      { wrapper: makeWrapper() },
    );

    const handlers = getHandlers();
    act(() => {
      handlers.onSync?.([{ user_id: PEER_A, online: true, typing: true }]);
    });
    // Pre-seed an unrelated conv so we can verify it survives unmount.
    act(() => {
      usePresence.getState().setTypingUsers('other-conv', [PEER_B]);
    });

    act(() => {
      unmount();
    });

    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([]);
    expect(usePresence.getState().typingUsers.get('other-conv')).toEqual([
      PEER_B,
    ]);
  });
});

describe('useTypingReceivers — re-subscribe on conversationId change', () => {
  it('clears the previous convId typingUsers when switching rooms', () => {
    const getHandlers = captureHandlers();
    const { rerender } = renderHook(
      ({ conversationId }) => useTypingReceivers({ conversationId }),
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
    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([PEER_A]);

    // Switch rooms — hook should re-subscribe (new closure mounted with new convId)
    act(() => {
      rerender({ conversationId: 'conv-2' });
    });

    // The OLD convId row should be cleared (the unmount cleanup ran on the
    // previous effect closure before the new one mounted).
    expect(usePresence.getState().typingUsers.get(CONV_ID)).toEqual([]);
    // The NEW convId's onSync handler should be a fresh closure
    const handlers2 = getHandlers();
    act(() => {
      handlers2.onSync?.([{ user_id: PEER_B, online: true, typing: true }]);
    });
    expect(usePresence.getState().typingUsers.get('conv-2')).toEqual([PEER_B]);
  });
});
