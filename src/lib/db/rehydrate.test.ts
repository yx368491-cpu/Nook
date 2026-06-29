import { afterEach, beforeEach, describe, it, expect } from 'vitest';

import {
  rehydrateOutboxOnStartup,
  __resetRehydrateOnceForTests,
  __getRehydrateOnceForTests,
} from '@/lib/db/rehydrate';

import {
  enqueue,
  applyMarkSent,
  applyMarkStaleOnStartup,
  STALE_THRESHOLD_MS,
  STALE_RESTART_SENTINEL,
  getOutboxRow,
} from '@/lib/db/outbox';
import { __resetDbForTests, getDb } from '@/lib/db/schema';

// ===========================================================================
// M5-3 — startup rehydrate sweep tests
// ===========================================================================
//
// Covers the boot-time `rehydrateOutboxOnStartup` flow: scan Dexie
// for `pending` rows older than STALE_THRESHOLD_MS, fan-out
// `applyMarkStaleOnStartup` per row, return counts. Plus the
// module-level singleton guard's behavior across re-invocation.
//
// Test isolation contract (per Vitest conventions):
//   - `beforeEach` is properly `async` so the Dexie close +
//     deleteDatabase + singleton reset COMPLETE before the test
//     body starts. The previous M5-1/M5-2 IIFE wrapper
//     pattern `void (async () => { ... })()` was a race condition
//     (test body could start before the await resolved).
//   - `afterEach` mirrors the same resets to clean up between
//     successive tests in the same file.
//   - Top-level `getDb` import (no per-test dynamic imports).
//   - Local helper `backdateRow(clientMsgId, ageMs)` keeps the
//     "force this row to look stale" boilerplate to one line
//     per test instead of five.
// ===========================================================================

/**
 * Forcibly back-date a row's `createdAt` so it appears older than
 * `STALE_THRESHOLD_MS` to the rehydrate sweep. This is the ONLY way
 * to exercise "stale" semantics without sleeping the test for
 * 5 minutes. The original row's other fields (state, attempts, …)
 * are preserved — we ONLY mutate `createdAt`.
 */
async function backdateRow(
  clientMsgId: string,
  ageMs: number = STALE_THRESHOLD_MS + 60_000,
): Promise<void> {
  const db = getDb();
  const existing = await db.outbox.get(clientMsgId);
  if (!existing) return;
  await db.outbox.put({
    ...existing,
    createdAt: Date.now() - ageMs,
  });
}

/**
 * Forcibly advance a row to TERMINAL `failed` state via a direct
 * Dexie put (no 5x `applyMarkFailed` calls needed). Mirrors the
 * user's mental model of "I have a row that's DEFINITELY failed
 * already; the rehydrate sweep must skip it."
 */
async function stageFailed(clientMsgId: string): Promise<void> {
  const db = getDb();
  const existing = await db.outbox.get(clientMsgId);
  if (!existing) return;
  await db.outbox.put({
    ...existing,
    state: 'failed',
    attempts: 999, // arbitrary > MAX_ATTEMPTS = 5
    failedAt: Date.now(),
    nextAttemptAt: null,
    lastError: 'test-pre-staged-failed',
  });
}

describe('rehydrateOutboxOnStartup — boot sweep', () => {
  beforeEach(async () => {
    // AWAIT BOTH: the Dexie reset (so prior tests' rows don't leak)
    // and the singleton reset (so a prior test's invocation does not
    // short-circuit this one).
    await __resetDbForTests();
    __resetRehydrateOnceForTests();
  });

  afterEach(async () => {
    await __resetDbForTests();
    __resetRehydrateOnceForTests();
  });

  it('returns zero counts when Dexie has no rows', async () => {
    const result = await rehydrateOutboxOnStartup();
    expect(result).toEqual({ staleCount: 0, markedFailedCount: 0 });
  });

  it('returns zero counts when pending rows are younger than STALE_THRESHOLD_MS', async () => {
    // `enqueue` WITHOUT a timestamp argument uses real `nowMs()`
    // (Date.now()) — `createdAt` lands within the testing
    // window, well inside STALE_THRESHOLD_MS.
    await enqueue({
      conversationId: 'conv-A',
      senderId: 'user-1',
      kind: 'text',
      body: 'fresh',
    });

    const result = await rehydrateOutboxOnStartup();
    expect(result.staleCount).toBe(0);
    expect(result.markedFailedCount).toBe(0);
  });

  it('marks one pre-dated stale pending row as terminal failed', async () => {
    const row = await enqueue({
      conversationId: 'conv-A',
      senderId: 'user-1',
      kind: 'text',
      body: 'orphan',
    });
    await backdateRow(row.clientMsgId);

    const result = await rehydrateOutboxOnStartup();
    expect(result.staleCount).toBe(1);
    expect(result.markedFailedCount).toBe(1);

    const final = await getOutboxRow(row.clientMsgId);
    expect(final!.state).toBe('failed');
    expect(final!.lastError).toBe(STALE_RESTART_SENTINEL);
    expect(final!.failedAt).not.toBeNull();
  });

  it('marks MULTIPLE pre-dated stale rows as terminal failed in one sweep', async () => {
    const inserted: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const row = await enqueue({
        conversationId: `conv-${i}`,
        senderId: 'user-1',
        kind: 'text',
        body: `msg-${i}`,
      });
      await backdateRow(row.clientMsgId, STALE_THRESHOLD_MS + 60_000 + i * 1000);
      inserted.push(row.clientMsgId);
    }

    const result = await rehydrateOutboxOnStartup();
    expect(result.staleCount).toBe(3);
    expect(result.markedFailedCount).toBe(3);

    for (const id of inserted) {
      const final = await getOutboxRow(id);
      expect(final!.state).toBe('failed');
      expect(final!.lastError).toBe(STALE_RESTART_SENTINEL);
    }
  });

  it('skips sent + failed rows even when aged', async () => {
    // Set up a sent row + a pre-staged failed row, then backdate
    // both so they'd be inside the threshold window IF they were
    // still 'pending'. The sweep must skip them by STATE, not by
    // age.
    const sentRow = await enqueue({
      conversationId: 'conv-A',
      senderId: 'user-1',
      kind: 'text',
      body: 'sent',
    });
    await applyMarkSent(sentRow.clientMsgId);
    await backdateRow(sentRow.clientMsgId);

    const failedRow = await enqueue({
      conversationId: 'conv-A',
      senderId: 'user-1',
      kind: 'text',
      body: 'failed',
    });
    await stageFailed(failedRow.clientMsgId);
    await backdateRow(failedRow.clientMsgId);

    const result = await rehydrateOutboxOnStartup();
    expect(result.staleCount).toBe(0);
    expect(result.markedFailedCount).toBe(0);
  });

  it('only marks rows old enough — fresh siblings untouched', async () => {
    const staleRow = await enqueue({
      conversationId: 'conv-A',
      senderId: 'user-1',
      kind: 'text',
      body: 'stale',
    });
    await backdateRow(staleRow.clientMsgId);

    const freshRow = await enqueue({
      conversationId: 'conv-A',
      senderId: 'user-1',
      kind: 'text',
      body: 'fresh',
    });
    // freshRow's createdAt is real `Date.now()` → inside the
    // alive window.

    const result = await rehydrateOutboxOnStartup();
    expect(result.staleCount).toBe(1);
    expect(result.markedFailedCount).toBe(1);

    const staleFinal = await getOutboxRow(staleRow.clientMsgId);
    expect(staleFinal!.state).toBe('failed');

    // Fresh row MUST still be pending — unaffected by the sweep.
    const freshFinal = await getOutboxRow(freshRow.clientMsgId);
    expect(freshFinal!.state).toBe('pending');
    expect(freshFinal!.lastError).toBeNull();
  });

  it('module-level singleton short-circuits second call within same process', async () => {
    // beforeEach already reset _rehydratedOnce=false, so this first
    // call is a real sweep (zero rows → returns zeros).
    const first = await rehydrateOutboxOnStartup();
    expect(first).toEqual({ staleCount: 0, markedFailedCount: 0 });
    expect(__getRehydrateOnceForTests()).toBe(true);

    // Second call: guard short-circuits, returns zeros WITHOUT
    // touching Dexie. The boolean is still true (no rollover).
    const second = await rehydrateOutboxOnStartup();
    expect(second).toEqual({ staleCount: 0, markedFailedCount: 0 });
    expect(__getRehydrateOnceForTests()).toBe(true);
  });

  it('singleton reset re-enables a real sweep', async () => {
    // Sweep #1 — fresh Dexie, no rows. Guard flips to true.
    expect(await rehydrateOutboxOnStartup()).toEqual({
      staleCount: 0,
      markedFailedCount: 0,
    });

    // Manually reset the guard so we can prove the second sweep
    // re-runs (otherwise the singleton short-circuit would kick in
    // and our backdated row would be skipped).
    __resetRehydrateOnceForTests();
    expect(__getRehydrateOnceForTests()).toBe(false);

    const row = await enqueue({
      conversationId: 'conv-A',
      senderId: 'user-1',
      kind: 'text',
      body: 'late',
    });
    await backdateRow(row.clientMsgId);

    const second = await rehydrateOutboxOnStartup();
    expect(second.staleCount).toBe(1);
    expect(second.markedFailedCount).toBe(1);
  });

  it('applyMarkStaleOnStartup is a defensive no-op on already-failed rows (idempotent boot retry)', async () => {
    const row = await enqueue({
      conversationId: 'conv-A',
      senderId: 'user-1',
      kind: 'text',
      body: 'x',
    });
    await backdateRow(row.clientMsgId);

    // First stale transition (real, since the row is still pending).
    const first = await applyMarkStaleOnStartup(row.clientMsgId);
    expect(first!.state).toBe('failed');
    const failedAt1 = first!.failedAt;

    // Second stale transition — defensive no-op on terminal failed;
    // failedAt + lastError from the FIRST transition are preserved.
    const second = await applyMarkStaleOnStartup(row.clientMsgId, Date.now() + 1_000);
    expect(second!.state).toBe('failed');
    expect(second!.failedAt).toBe(failedAt1);
    expect(second!.lastError).toBe(STALE_RESTART_SENTINEL);
  });
});

describe('rehydrateOutboxOnStartup — singleton helper exports', () => {
  it('__resetRehydrateOnceForTests clears the guard', () => {
    __resetRehydrateOnceForTests();
    expect(__getRehydrateOnceForTests()).toBe(false);
  });

  it('the helpers are independent of the singleton guard across tests', async () => {
    // First call sets the guard to true (singleton short-circuit).
    expect(__getRehydrateOnceForTests()).toBe(false);
    await rehydrateOutboxOnStartup();
    expect(__getRehydrateOnceForTests()).toBe(true);
    // Manual reset clears it.
    __resetRehydrateOnceForTests();
    expect(__getRehydrateOnceForTests()).toBe(false);
  });
});
