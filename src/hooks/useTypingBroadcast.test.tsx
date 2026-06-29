import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingBroadcast } from './useTypingBroadcast';

// ===========================================================================
// Module-level mocks
// ===========================================================================
//
// Full module-level stub of `@/lib/supabase` so the real `createClient`
// never runs in jsdom (env.ts reads `import.meta.env.VITE_SUPABASE_URL ??
// ''` and we don't have a real anon key in tests).
//
// The same factory pattern as the M4-3 useEditMessage tests:
//   - `channel(name, config)` returns a shared `channelInstance` with
//     chainable `.on().subscribe()` builders and observable spies for
//     `.track()`.
//   - `removeChannel(...)` is a no-op (we don't exercise ChatPanel-side
//     channel cleanup here — that's useConversationPresence' territory).
vi.mock('@/lib/supabase', () => {
  const channelInstance = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
    track: vi.fn().mockResolvedValue('ok'),
    untrack: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn(() => ({})),
  };
  return {
    supabase: {
      channel: vi.fn(() => channelInstance),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    },
  };
});

import { supabase } from '@/lib/supabase';

// ===========================================================================
// Fixtures
// ===========================================================================

const CONV_ID = 'conv-1';
const SELF = 'user-self';

function getChannelInstance() {
  // The factory creates a single closed-over instance; each `vi.resetAllMocks`
  // clears the spy CALL history on that instance but keeps the instance.
  return (supabase.channel as unknown as () => {
    track: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  })();
}

function makeWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <>{children}</>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('useTypingBroadcast — startTyping / 5s idle timer', () => {
  it('emits track({typing: true}) with own user_id + online:true on FIRST startTyping', () => {
    const ch = getChannelInstance();
    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.startTyping();
    });

    expect(ch.track).toHaveBeenCalledTimes(1);
    expect(ch.track).toHaveBeenCalledWith({
      user_id: SELF,
      online: true,
      typing: true,
    });
    expect(supabase.channel).toHaveBeenCalledWith(`presence:${CONV_ID}`, {
      config: { presence: { key: 'user_id' } },
    });
    expect(ch.subscribe).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-emit track(true) for subsequent startTyping within the same idle window', () => {
    const ch = getChannelInstance();
    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.startTyping();
      result.current.startTyping();
      result.current.startTyping();
    });

    // Only ONE track(true); subsequent calls reset the idle timer but
    // currentlyTrackingTypingRef short-circuits re-emission.
    expect(ch.track).toHaveBeenCalledTimes(1);
    expect(ch.track).toHaveBeenCalledWith({
      user_id: SELF,
      online: true,
      typing: true,
    });
  });

  it('emits track({typing: false}) when the 5s idle window elapses', () => {
    const ch = getChannelInstance();
    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.startTyping();
    });
    expect(ch.track).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(ch.track).toHaveBeenCalledTimes(2);
    expect(ch.track).toHaveBeenLastCalledWith({
      user_id: SELF,
      online: true,
      typing: false,
    });
  });

  it('does NOT emit track(false) before the 5s threshold is reached', () => {
    const ch = getChannelInstance();
    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.startTyping();
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(ch.track).toHaveBeenCalledTimes(1);
    expect(ch.track).toHaveBeenLastCalledWith({
      user_id: SELF,
      online: true,
      typing: true,
    });
  });

  it('resets the 5s window on each subsequent startTyping keystroke (no premature stop after sustained typing)', () => {
    const ch = getChannelInstance();
    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.startTyping(); // arm timer at t=0
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(ch.track).toHaveBeenCalledTimes(1); // still typing

    act(() => {
      result.current.startTyping(); // reset timer at t=4s
    });
    act(() => {
      vi.advanceTimersByTime(4000); // t=8s total, but only 4s since reset
    });
    expect(ch.track).toHaveBeenCalledTimes(1); // still typing

    act(() => {
      vi.advanceTimersByTime(1000); // t=9s total, 5s since reset
    });
    expect(ch.track).toHaveBeenCalledTimes(2);
    expect(ch.track).toHaveBeenLastCalledWith({
      user_id: SELF,
      online: true,
      typing: false,
    });
  });
});

describe('useTypingBroadcast — stopTyping (eager stop)', () => {
  it('emits track(false) eagerly when stopTyping is called mid-session', () => {
    const ch = getChannelInstance();
    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.startTyping();
      result.current.stopTyping();
    });

    expect(ch.track).toHaveBeenCalledTimes(2);
    expect(ch.track).toHaveBeenNthCalledWith(1, {
      user_id: SELF,
      online: true,
      typing: true,
    });
    expect(ch.track).toHaveBeenNthCalledWith(2, {
      user_id: SELF,
      online: true,
      typing: false,
    });
  });

  it('clears the pending idle timer so track(false) does NOT double-fire after stopTyping', () => {
    const ch = getChannelInstance();
    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.startTyping();
      result.current.stopTyping();
    });
    expect(ch.track).toHaveBeenCalledTimes(2); // (true) + (false-eager)

    act(() => {
      vi.advanceTimersByTime(5000); // window already cleared
    });

    // Still only 2 — the timer was cleared by stopTyping.
    expect(ch.track).toHaveBeenCalledTimes(2);
  });

  it('does NOT emit track(false) when stopTyping is called without a prior startTyping', () => {
    const ch = getChannelInstance();
    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.stopTyping();
    });

    expect(ch.track).not.toHaveBeenCalled();
  });
});

describe('useTypingBroadcast — unmount cleanup', () => {
  it('emits a final track(false) on unmount IF currentlyTracking was true', () => {
    const ch = getChannelInstance();
    const { result, unmount } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      result.current.startTyping();
    });
    expect(ch.track).toHaveBeenCalledTimes(1);

    act(() => {
      unmount();
    });

    expect(ch.track).toHaveBeenCalledTimes(2);
    expect(ch.track).toHaveBeenLastCalledWith({
      user_id: SELF,
      online: true,
      typing: false,
    });
  });

  it('does NOT emit any track on unmount when nothing was being tracked', () => {
    const ch = getChannelInstance();
    const { unmount } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: SELF },
      },
    );

    act(() => {
      unmount();
    });

    expect(ch.track).not.toHaveBeenCalled();
  });
});

describe('useTypingBroadcast — early bail', () => {
  it('does NOT touch supabase.channel when conversationId is empty', () => {
    // Snapshot the call count BEFORE renderHook — `getChannelInstance()`
    // would itself bump the spy by triggering `supabase.channel()`, so we
    // measure only the delta caused by the hook.
    const channelSpy = vi.mocked(supabase.channel);
    const callsBefore = channelSpy.mock.calls.length;

    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: '', selfUserId: SELF },
      },
    );

    expect(channelSpy.mock.calls.length).toBe(callsBefore);

    act(() => {
      result.current.startTyping();
      result.current.stopTyping();
    });

    // Still no new channel call after start/stop attempts.
    expect(channelSpy.mock.calls.length).toBe(callsBefore);
  });

  it('does NOT touch supabase.channel when selfUserId is null', () => {
    const channelSpy = vi.mocked(supabase.channel);
    const callsBefore = channelSpy.mock.calls.length;

    const { result } = renderHook(
      ({ conversationId, selfUserId }) =>
        useTypingBroadcast({ conversationId, selfUserId }),
      {
        wrapper: makeWrapper(),
        initialProps: { conversationId: CONV_ID, selfUserId: null },
      },
    );

    expect(channelSpy.mock.calls.length).toBe(callsBefore);

    act(() => {
      result.current.startTyping();
      result.current.stopTyping();
    });

    expect(channelSpy.mock.calls.length).toBe(callsBefore);
  });
});
