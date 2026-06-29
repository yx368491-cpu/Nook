import { afterEach, describe, it, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { __resetDbForTests } from '@/lib/db/schema';
import {
  useOutbox,
  useTotalOutboxCount,
  useOutboxManualRefresh,
} from '@/hooks/useOutbox';
import {
  enqueue,
  applyMarkSending,
  applyMarkSent,
  applyMarkFailed,
} from '@/lib/db/outbox';

// ===========================================================================
// M5-1 tests — useOutbox read-only observer hook
// ===========================================================================
//
// Wraps the Dexie liveQuery result inside React state and asserts:
//   1. Initial mount returns empty bucket + isLoading=true then false
//   2. Insert enqueue → live re-emit with the row bucketed pending
//   3. markSending transition re-emits as `pending` bucket (sending ⊆ pending)
//   4. markSent transition re-emits as `sent` bucket
//   5. Failed transitions re-emit as `failed` bucket
//   6. Different conversationId filters correctly (no leakage across convs)
//   7. Total counter observes all conversations
//   8. Manual refresh triggers a synchronous UI re-render
// ===========================================================================

const NOW_ZERO = 1_700_000_000_000;

describe('useOutbox — live query + bucketed state view', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('starts with empty buckets and resolves isLoading after initial query', async () => {
    const { result } = renderHook(() => useOutbox('conv-A'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pending).toEqual([]);
    expect(result.current.sent).toEqual([]);
    expect(result.current.failed).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('returns empty buckets when conversationId is null', async () => {
    const { result } = renderHook(() => useOutbox(null));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.total).toBe(0);
  });

  it('re-emits when a fresh row is enqueued → lands in `pending`', async () => {
    const { result } = renderHook(() => useOutbox('conv-A'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const row = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'hi' },
      NOW_ZERO,
    );

    await waitFor(() => {
      expect(result.current.total).toBe(1);
      expect(result.current.pending).toHaveLength(1);
      expect(result.current.pending[0]!.clientMsgId).toBe(row.clientMsgId);
    });
    expect(result.current.sent).toEqual([]);
    expect(result.current.failed).toEqual([]);
  });

  it('re-emits on markSending → still lands in `pending` (sending ⊆ pending)', async () => {
    const { result } = renderHook(() => useOutbox('conv-A'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const row = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'hi' },
      NOW_ZERO,
    );
    await applyMarkSending(row.clientMsgId, NOW_ZERO + 100);

    await waitFor(() => {
      expect(result.current.pending).toHaveLength(1);
      expect(result.current.pending[0]!.state).toBe('sending');
    });
  });

  it('re-emits on markSent → moves row from pending to sent bucket', async () => {
    const { result } = renderHook(() => useOutbox('conv-A'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const row = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'hi' },
      NOW_ZERO,
    );
    await applyMarkSent(row.clientMsgId, NOW_ZERO + 100);

    await waitFor(() => {
      expect(result.current.pending).toEqual([]);
      expect(result.current.sent).toHaveLength(1);
      expect(result.current.sent[0]!.clientMsgId).toBe(row.clientMsgId);
    });
    expect(result.current.total).toBe(1);
  });

  it('re-emits on markFailed → retries fill pending then terminal-failed fills failed bucket', async () => {
    const { result } = renderHook(() => useOutbox('conv-A'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const row = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'hi' },
      NOW_ZERO,
    );
    // First failure: stays pending (attempts=1 < MAX=5)
    await applyMarkFailed(row.clientMsgId, 'err-1', NOW_ZERO + 100);
    await waitFor(() => {
      expect(result.current.pending).toHaveLength(1);
      expect(result.current.failed).toEqual([]);
    });

    // Drive to terminal failed (attempts 2 → 5)
    await applyMarkFailed(row.clientMsgId, 'err-2', NOW_ZERO + 200);
    await applyMarkFailed(row.clientMsgId, 'err-3', NOW_ZERO + 300);
    await applyMarkFailed(row.clientMsgId, 'err-4', NOW_ZERO + 400);
    await applyMarkFailed(row.clientMsgId, 'err-5', NOW_ZERO + 500);

    await waitFor(() => {
      expect(result.current.pending).toEqual([]);
      expect(result.current.failed).toHaveLength(1);
      expect(result.current.failed[0]!.lastError).toBe('err-5');
    });
    expect(result.current.total).toBe(1);
  });

  it('filters strictly by conversationId (no leakage across rooms)', async () => {
    const { result } = renderHook(() => useOutbox('conv-A'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await enqueue(
      { conversationId: 'conv-B', senderId: 'user-1', kind: 'text', body: 'b' },
      NOW_ZERO,
    );
    await enqueue(
      { conversationId: 'conv-C', senderId: 'user-1', kind: 'text', body: 'c' },
      NOW_ZERO + 1,
    );

    // Live query should NOT fire for off-conv rows. The hook's
    // `where('conversationId').equals(...)` filter scopes to conv-A.
    // Give dexie-react-hooks a tick to settle; we expect total=0 still.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(result.current.total).toBe(0);

    // Now the same conv DOES fire.
    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'a' },
      NOW_ZERO + 2,
    );
    await waitFor(() => expect(result.current.total).toBe(1));
  });

  it('multi-row ordering matches FIFO (createdAt ASC)', async () => {
    const { result } = renderHook(() => useOutbox('conv-A'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'second' },
      NOW_ZERO + 100,
    );
    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'first' },
      NOW_ZERO + 50,
    );
    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'third' },
      NOW_ZERO + 150,
    );

    await waitFor(() => expect(result.current.pending).toHaveLength(3));
    expect(result.current.pending.map((r) => r.body)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });
});

// ===========================================================================
// useTotalOutboxCount — global counter across all rooms
// ===========================================================================

describe('useTotalOutboxCount — global pending counter', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('starts at 0 with an empty DB', async () => {
    const { result } = renderHook(() => useTotalOutboxCount());
    await waitFor(() => expect(result.current).toBe(0));
  });

  it('counts rows across multiple conversations', async () => {
    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'a' },
      NOW_ZERO,
    );
    await enqueue(
      { conversationId: 'conv-B', senderId: 'user-1', kind: 'text', body: 'b' },
      NOW_ZERO + 1,
    );
    await enqueue(
      { conversationId: 'conv-C', senderId: 'user-1', kind: 'text', body: 'c' },
      NOW_ZERO + 2,
    );

    const { result } = renderHook(() => useTotalOutboxCount());
    await waitFor(() => expect(result.current).toBe(3));
  });

  it('counts sent rows that are still inside the 30-min grace window', async () => {
    // NOTE: we use real wall-clock here (no NOW_ZERO) because the
    // hook reads Date.now() and SENT_GRACE_MS = 30 min. A row stamped
    // with NOW_ZERO (2023) would be 3 years stale and excluded.
    const row = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'a' },
    );
    await applyMarkSent(row.clientMsgId);

    const { result } = renderHook(() => useTotalOutboxCount());
    await waitFor(() => expect(result.current).toBe(1));
  });

  it('counts terminal-failed rows', async () => {
    const row = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'a' },
      NOW_ZERO,
    );
    // Drive to terminal failed (5 failures)
    for (let i = 1; i <= 5; i += 1) {
      await applyMarkFailed(row.clientMsgId, `err-${i}`, NOW_ZERO + i * 100);
    }

    const { result } = renderHook(() => useTotalOutboxCount());
    await waitFor(() => expect(result.current).toBe(1));
  });
});

// ===========================================================================
// useOutboxManualRefresh — manual re-render trigger (safety hatch)
// ===========================================================================

describe('useOutboxManualRefresh — manual re-render trigger', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('returns a callable function that forces a re-render', () => {
    // Hook returns the setter directly; the second render returns
    // whatever the setter-callback did, so we just persist `count`
    // to a closure-ref and assert on the ref after invoking it.
    let renderCount = 0;
    const probe = { count: 0 };
    const { result } = renderHook(() => {
      renderCount += 1;
      probe.count = renderCount;
      return useOutboxManualRefresh();
    });
    const before = renderCount;
    expect(typeof result.current).toBe('function');
    act(() => {
      result.current();
    });
    expect(renderCount).toBeGreaterThan(before);
    expect(probe.count).toBe(renderCount);
  });
});
