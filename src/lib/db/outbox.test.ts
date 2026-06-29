import { afterEach, describe, it, expect } from 'vitest';
import {
  // constants
  RETRY_BACKOFF_BASE_MS,
  RETRY_BACKOFF_CAP_MS,
  MAX_ATTEMPTS,
  SENT_GRACE_MS,
  STALE_THRESHOLD_MS,
  // pure reducers
  backoffMsFor,
  initOutboxRow,
  markSending,
  markSent,
  markFailed,
  markStale,
  // mutators
  enqueue,
  applyMarkSending,
  applyMarkSent,
  applyMarkFailed,
  applyMarkStaleOnStartup,
  purgeSentBefore,
  getOutboxRow,
  listOutboxForConversation,
  loadStalePendingForRehydrate,
} from '@/lib/db/outbox';
import { __resetDbForTests } from '@/lib/db/schema';

// ===========================================================================
// M5-1 tests — outbox state machine (lib/db/outbox.ts)
// ===========================================================================
//
// These tests are the SOURCE OF TRUTH for the outbox foundation.
// They cover both the pure reducers (no Dexie) and the Dexie-backed
// mutators to ensure the two layers stay symmetric.
//
// State machine diagram (each row goes through one of these paths):
//
//   enqueue()                  markSending()       markSent()
// (none) ─────────► pending ────────────► sending ─────────► sent
//                      │ retry (attempts < MAX)
//                      ▼
//                   pending          attempts >= MAX
//                      │                 ↓
//                      │              failed (terminal)
//                      ▼
//                  pending
//
// Test sections:
//   1. backoffMsFor  — exponential schedule up to 60s cap
//   2. initOutboxRow — pending + now-timestamps, correct row shape
//   3. markSending   — pending → sending, timestamping + attempts-immutable
//   4. markSent      — sending → sent + sentAt stamp + error cleared
//   5. markFailed    — attempts++; backoff OR terminal-failed at MAX
//   6. Dexie mutator parity — pure reducer output == mutator output
//   7. purgeSentBefore — only stale sent rows removed
// ===========================================================================

const NOW_ZERO = 1_700_000_000_000;

describe('backoffMsFor — exponential retry schedule', () => {
  it('returns 0 attempts → ~1s', () => {
    expect(backoffMsFor(0)).toBe(RETRY_BACKOFF_BASE_MS);
  });

  it('returns 1 attempt → 2s', () => {
    expect(backoffMsFor(1)).toBe(2 * RETRY_BACKOFF_BASE_MS);
  });

  it('returns 2 attempts → 4s', () => {
    expect(backoffMsFor(2)).toBe(4 * RETRY_BACKOFF_BASE_MS);
  });

  it('returns 3 attempts → 8s', () => {
    expect(backoffMsFor(3)).toBe(8 * RETRY_BACKOFF_BASE_MS);
  });

  it('returns 4 attempts → 16s', () => {
    expect(backoffMsFor(4)).toBe(16 * RETRY_BACKOFF_BASE_MS);
  });

  it('clamps the schedule at the cap (60s)', () => {
    expect(backoffMsFor(10)).toBe(RETRY_BACKOFF_CAP_MS);
    expect(backoffMsFor(20)).toBe(RETRY_BACKOFF_CAP_MS);
  });

  it('defends against negative attempts (treats as 0)', () => {
    expect(backoffMsFor(-1)).toBe(RETRY_BACKOFF_BASE_MS);
    expect(backoffMsFor(-1000)).toBe(RETRY_BACKOFF_BASE_MS);
  });
});

// ===========================================================================
// Pure reducer — initOutboxRow
// ===========================================================================

describe('initOutboxRow — fresh row construction', () => {
  it('starts at state="pending" with zero attempts', () => {
    const row = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hello',
      },
      NOW_ZERO,
    );
    expect(row.state).toBe('pending');
    expect(row.attempts).toBe(0);
    expect(row.lastAttemptAt).toBeNull();
    expect(row.nextAttemptAt).toBeNull();
    expect(row.sentAt).toBeNull();
    expect(row.failedAt).toBeNull();
    expect(row.lastError).toBeNull();
    expect(row.createdAt).toBe(NOW_ZERO);
    expect(row.updatedAt).toBe(NOW_ZERO);
  });

  it('mints a client_msg_id when caller did not provide one', () => {
    const row = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
      },
      NOW_ZERO,
    );
    expect(row.clientMsgId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('reuses caller-provided clientMsgId (M5-3 SW replay path)', () => {
    const row = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
        clientMsgId: '11111111-1111-4111-8111-111111111111',
      },
      NOW_ZERO,
    );
    expect(row.clientMsgId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('captures replyToId when supplied and null when omitted', () => {
    const withReply = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'reply',
        replyToId: 'msg-target',
      },
      NOW_ZERO,
    );
    expect(withReply.replyToId).toBe('msg-target');

    const none = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'plain',
      },
      NOW_ZERO,
    );
    expect(none.replyToId).toBeNull();
  });
});

// ===========================================================================
// Pure reducer — markSending (asserting no mutation of input)
// ===========================================================================

describe('markSending — pending → sending transition', () => {
  it('flips state to sending and stamps lastAttemptAt', () => {
    const pending = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
      },
      NOW_ZERO,
    );
    const after = markSending(pending, NOW_ZERO + 50);
    expect(after.state).toBe('sending');
    expect(after.lastAttemptAt).toBe(NOW_ZERO + 50);
    expect(after.nextAttemptAt).toBeNull();
    expect(after.updatedAt).toBe(NOW_ZERO + 50);
  });

  it('does NOT mutate the input row', () => {
    const pending = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
      },
      NOW_ZERO,
    );
    const snapshot = JSON.stringify(pending);
    markSending(pending, NOW_ZERO + 50);
    expect(JSON.stringify(pending)).toBe(snapshot);
  });

  it('does NOT change state when row is already sent (caller bug)', () => {
    const sent = { ...initOutboxRow({ conversationId: 'a', senderId: 'b', kind: 'text', body: 'x' }, NOW_ZERO), state: 'sent' as const, sentAt: NOW_ZERO + 10 };
    const result = markSending(sent, NOW_ZERO + 100);
    expect(result.state).toBe('sent');
    // updatedAt IS bumped so the cache invalidation layer can react
    expect(result.updatedAt).toBe(NOW_ZERO + 100);
  });

  it('does NOT change state when row is already failed (caller bug)', () => {
    const failed = { ...initOutboxRow({ conversationId: 'a', senderId: 'b', kind: 'text', body: 'x' }, NOW_ZERO), state: 'failed' as const, failedAt: NOW_ZERO + 10 };
    const result = markSending(failed, NOW_ZERO + 100);
    expect(result.state).toBe('failed');
  });
});

// ===========================================================================
// Pure reducer — markSent
// ===========================================================================

describe('markSent — sending → sent transition (and defensive shortcuts)', () => {
  it('flips sending → sent and sets sentAt + clears lastError', () => {
    const sending = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
      },
      NOW_ZERO,
    );
    const afterSend = markSending(sending, NOW_ZERO + 10);
    expect(afterSend.state).toBe('sending');

    const sent = markSent(afterSend, NOW_ZERO + 50);
    expect(sent.state).toBe('sent');
    expect(sent.sentAt).toBe(NOW_ZERO + 50);
    expect(sent.lastAttemptAt).toBe(NOW_ZERO + 50);
    expect(sent.lastError).toBeNull();
  });

  it('does NOT mutate the input row', () => {
    const sending = markSending(
      initOutboxRow(
        {
          conversationId: 'conv-A',
          senderId: 'user-1',
          kind: 'text',
          body: 'hi',
        },
        NOW_ZERO,
      ),
      NOW_ZERO + 10,
    );
    const snapshot = JSON.stringify(sending);
    markSent(sending, NOW_ZERO + 50);
    expect(JSON.stringify(sending)).toBe(snapshot);
  });

  it('defensive: pending → sent shortcut (sync-test bypass)', () => {
    const pending = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
      },
      NOW_ZERO,
    );
    const sent = markSent(pending, NOW_ZERO + 5);
    expect(sent.state).toBe('sent');
    expect(sent.sentAt).toBe(NOW_ZERO + 5);
  });

  it('does NOT change state when row is already sent', () => {
    const sentInit = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
      },
      NOW_ZERO,
    );
    const alreadySent = markSent(sentInit, NOW_ZERO + 10);
    const double = markSent(alreadySent, NOW_ZERO + 100);
    expect(double.state).toBe('sent');
    // sentAt from the first transition is preserved
    expect(double.sentAt).toBe(NOW_ZERO + 10);
  });

  it('does NOT change state when row is failed', () => {
    const failed = { ...initOutboxRow({ conversationId: 'a', senderId: 'b', kind: 'text', body: 'x' }, NOW_ZERO), state: 'failed' as const };
    const result = markSent(failed, NOW_ZERO + 100);
    expect(result.state).toBe('failed');
  });
});

// ===========================================================================
// Pure reducer — markFailed (retry fan-out + MAX_ATTEMPTS terminal)
// ===========================================================================

describe('markFailed — attempts++; backoff OR failed at MAX', () => {
  it('attempts=0 → fails once (>1 attempt reads), stays pending with next attempt', () => {
    const pending = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
      },
      NOW_ZERO,
    );
    const result = markFailed(pending, 'boom', NOW_ZERO + 100);
    expect(result.attempts).toBe(1);
    expect(result.state).toBe('pending');
    expect(result.lastError).toBe('boom');
    expect(result.lastAttemptAt).toBe(NOW_ZERO + 100);
    // nextAttemptAt = now + backoff(1) = NOW_ZERO + 100 + 2000ms
    expect(result.nextAttemptAt).toBe(NOW_ZERO + 100 + backoffMsFor(1));
  });

  it('attempts=MAX_ATTEMPTS → terminal failed', () => {
    let row = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hi',
      },
      NOW_ZERO,
    );
    // After MAX-1 failures (4), the row is still pending (attempts=4,
    // MAX=5, condition `nextAttempts >= MAX` is false).
    row = markFailed(row, 'e1', NOW_ZERO + 100);
    row = markFailed(row, 'e2', NOW_ZERO + 200);
    row = markFailed(row, 'e3', NOW_ZERO + 300);
    row = markFailed(row, 'e4', NOW_ZERO + 400);
    expect(row.state).toBe('pending');
    expect(row.attempts).toBe(4);

    // 5th failure pushes attempts to 5 = MAX, terminal failed.
    row = markFailed(row, 'e5', NOW_ZERO + 500);
    expect(row.attempts).toBe(MAX_ATTEMPTS);
    expect(row.state).toBe('failed');
    expect(row.failedAt).toBe(NOW_ZERO + 500);
    expect(row.nextAttemptAt).toBeNull();
    expect(row.lastError).toBe('e5');
  });

  it('does NOT mutate the input row', () => {
    const row = initOutboxRow(
      { conversationId: 'a', senderId: 'u', kind: 'text', body: 'x' },
      NOW_ZERO,
    );
    const snapshot = JSON.stringify(row);
    markFailed(row, 'err', NOW_ZERO + 100);
    expect(JSON.stringify(row)).toBe(snapshot);
  });

  it('truncates oversized error messages to 500 chars', () => {
    const row = initOutboxRow(
      { conversationId: 'a', senderId: 'u', kind: 'text', body: 'x' },
      NOW_ZERO,
    );
    const huge = 'x'.repeat(10_000);
    const result = markFailed(row, huge, NOW_ZERO + 100);
    expect(result.lastError).not.toBeNull();
    expect(result.lastError!.length).toBe(500);
  });

  it('does NOT change state when row is already sent', () => {
    const sentInit = initOutboxRow(
      { conversationId: 'a', senderId: 'u', kind: 'text', body: 'x' },
      NOW_ZERO,
    );
    const sent = markSent(sentInit, NOW_ZERO + 10);
    const result = markFailed(sent, 'late', NOW_ZERO + 100);
    expect(result.state).toBe('sent');
  });
});

// ===========================================================================
// Dexie mutators — wrapping the reducers (parity check)
// ===========================================================================

describe('Dexie mutator wrappers — parity with pure reducers', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('enqueue / applyMarkSending / applyMarkSent chain updates the row in place', async () => {
    const row = await enqueue(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hello',
      },
      NOW_ZERO,
    );
    expect(row.state).toBe('pending');

    const afterSending = await applyMarkSending(row.clientMsgId, NOW_ZERO + 10);
    expect(afterSending!.state).toBe('sending');

    const afterSent = await applyMarkSent(row.clientMsgId, NOW_ZERO + 50);
    expect(afterSent!.state).toBe('sent');

    // Verify Dexie has the final state
    const finalRow = await getOutboxRow(row.clientMsgId);
    expect(finalRow!.state).toBe('sent');
    expect(finalRow!.sentAt).toBe(NOW_ZERO + 50);
  });

  it('applyMarkFailed increments attempts and persists lastError', async () => {
    const row = await enqueue(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hello',
      },
      NOW_ZERO,
    );
    await applyMarkFailed(row.clientMsgId, 'network down', NOW_ZERO + 100);
    const after = await getOutboxRow(row.clientMsgId);
    expect(after!.attempts).toBe(1);
    expect(after!.lastError).toBe('network down');
    expect(after!.state).toBe('pending');
    expect(after!.nextAttemptAt).toBe(NOW_ZERO + 100 + backoffMsFor(1));
  });

  it('missing PK returns null (defensive for stale callers)', async () => {
    expect(
      await applyMarkSending('00000000-0000-4000-8000-000000000000', NOW_ZERO),
    ).toBeNull();
    expect(
      await applyMarkSent('00000000-0000-4000-8000-000000000000', NOW_ZERO),
    ).toBeNull();
    expect(
      await applyMarkFailed('00000000-0000-4000-8000-000000000000', 'e', NOW_ZERO),
    ).toBeNull();
  });
});

// ===========================================================================
// purgeSentBefore — bulk cleanup of grace-expired sent rows
// ===========================================================================

describe('purgeSentBefore — grace-window expiry sweep', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('removes only sent rows whose sentAt + SENT_GRACE_MS has elapsed', async () => {
    const oldSent = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'old' },
      NOW_ZERO,
    );
    await applyMarkSent(oldSent.clientMsgId, NOW_ZERO);

    const freshSent = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'fresh' },
      NOW_ZERO + 1,
    );
    await applyMarkSent(freshSent.clientMsgId, NOW_ZERO + 1_000_000);

    const pendingRow = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'still-pending' },
      NOW_ZERO + 2,
    );

    // NOW = NOW_ZERO + SENT_GRACE_MS + 1 → oldSent is stale, freshSent
    // is NOT stale (its sentAt is only ~1e6 ms old, well within grace).
    // pendingRow is unaffected (not in `sent` state).
    const purgedCount = await purgeSentBefore(NOW_ZERO + SENT_GRACE_MS + 1);
    expect(purgedCount).toBe(1);

    expect(await getOutboxRow(oldSent.clientMsgId)).toBeNull();
    expect(await getOutboxRow(freshSent.clientMsgId)).not.toBeNull();
    expect(await getOutboxRow(pendingRow.clientMsgId)).not.toBeNull();
  });

  it('returns 0 when no sent rows are stale', async () => {
    const row = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'fresh' },
      NOW_ZERO,
    );
    await applyMarkSent(row.clientMsgId, NOW_ZERO);
    const purged = await purgeSentBefore(NOW_ZERO + 1_000);
    expect(purged).toBe(0);
    expect(await getOutboxRow(row.clientMsgId)).not.toBeNull();
  });

  it('does NOT touch pending / failed rows', async () => {
    const pending = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'p' },
      NOW_ZERO,
    );
    await applyMarkFailed(pending.clientMsgId, 'err', NOW_ZERO + 100);
    // Drive to terminal failed by failing it 5 times
    await applyMarkFailed(pending.clientMsgId, 'err2', NOW_ZERO + 200);
    await applyMarkFailed(pending.clientMsgId, 'err3', NOW_ZERO + 300);
    await applyMarkFailed(pending.clientMsgId, 'err4', NOW_ZERO + 400);
    await applyMarkFailed(pending.clientMsgId, 'err5', NOW_ZERO + 500);

    const purged = await purgeSentBefore(NOW_ZERO + SENT_GRACE_MS * 10);
    expect(purged).toBe(0);
    const stillThere = await getOutboxRow(pending.clientMsgId);
    expect(stillThere).not.toBeNull();
    expect(stillThere!.state).toBe('failed');
  });
});

// ===========================================================================
// listOutboxForConversation — FIFO projection used by useOutbox hook
// ===========================================================================

describe('listOutboxForConversation — FIFO projection', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('returns rows in createdAt ASC order, conversation-scoped', async () => {
    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'b' },
      NOW_ZERO + 100,
    );
    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'a' },
      NOW_ZERO + 50,
    );
    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'c' },
      NOW_ZERO + 150,
    );
    await enqueue(
      { conversationId: 'conv-B', senderId: 'user-1', kind: 'text', body: 'x' },
      NOW_ZERO + 75,
    );

    const rows = await listOutboxForConversation('conv-A');
    expect(rows.map((r) => r.body)).toEqual(['a', 'b', 'c']);
  });
});

// ===========================================================================
// M5-3 — startup rehydrate transitions (markStale + applyMarkStaleOnStartup)
// ===========================================================================
//
// The rehydrate sweep identifies `pending` rows older than
// STALE_THRESHOLD_MS and transitions them to terminal `failed` with
// lastError='app-restart-during-outage'. This is the recovery path
// for the common case where the user closed the app mid-retry and
// reopened it after the SW / browser tab stale-row budget elapsed.
// ===========================================================================

describe('markStale — direct-to-terminal transition (pending → failed)', () => {
  it('flips pending → failed, sets attempts=MAX, stamps failedAt + canonical lastError', () => {
    const pending = initOutboxRow(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'orphan' },
      NOW_ZERO,
    );
    const result = markStale(pending, NOW_ZERO + 1_000);
    expect(result.state).toBe('failed');
    expect(result.attempts).toBe(MAX_ATTEMPTS);
    expect(result.failedAt).toBe(NOW_ZERO + 1_000);
    expect(result.lastAttemptAt).toBe(NOW_ZERO + 1_000);
    expect(result.lastError).toBe('app-restart-during-outage');
    expect(result.nextAttemptAt).toBeNull();
  });

  it('does NOT mutate the input row', () => {
    const pending = initOutboxRow(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'x' },
      NOW_ZERO,
    );
    const snapshot = JSON.stringify(pending);
    markStale(pending, NOW_ZERO + 100);
    expect(JSON.stringify(pending)).toBe(snapshot);
  });

  it('defensive no-op when row is already sent (terminal guard)', () => {
    const sentInit = initOutboxRow(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'x' },
      NOW_ZERO,
    );
    const sent = markSent(sentInit, NOW_ZERO + 10);
    const result = markStale(sent, NOW_ZERO + 100);
    expect(result.state).toBe('sent');
    expect(result.lastError).toBeNull();
    // updatedAt IS bumped so cache invalidation can react
    expect(result.updatedAt).toBe(NOW_ZERO + 100);
  });

  it('defensive no-op when row is already failed (duplicate rehydrate)', () => {
    const pending = initOutboxRow(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'x' },
      NOW_ZERO,
    );
    const once = markStale(pending, NOW_ZERO + 50);
    const twice = markStale(once, NOW_ZERO + 200);
    expect(twice.state).toBe('failed');
    // failedAt / lastError from the FIRST transition preserved
    expect(twice.failedAt).toBe(NOW_ZERO + 50);
    expect(twice.lastError).toBe('app-restart-during-outage');
  });
});

// ===========================================================================
// Dexie mutator — applyMarkStaleOnStartup + loadStalePendingForRehydrate
// ===========================================================================

describe('applyMarkStaleOnStartup + loadStalePendingForRehydrate — Dexie parity', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('markStale pure reducer output == applyMarkStaleOnStartup mutator output', async () => {
    const row = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'orphan' },
      NOW_ZERO,
    );
    const before = await getOutboxRow(row.clientMsgId);
    const pureExpected = markStale(before!, NOW_ZERO + 1_000);
    const fromDb = await applyMarkStaleOnStartup(row.clientMsgId, NOW_ZERO + 1_000);
    expect(fromDb).not.toBeNull();
    // Compare each field; attempts + failedAt + lastError + state are
    // the load-bearing values for the UI surfaces.
    expect(fromDb!.state).toBe(pureExpected.state);
    expect(fromDb!.attempts).toBe(pureExpected.attempts);
    expect(fromDb!.failedAt).toBe(pureExpected.failedAt);
    expect(fromDb!.lastError).toBe(pureExpected.lastError);
    expect(fromDb!.nextAttemptAt).toBe(pureExpected.nextAttemptAt);
  });

  it('loadStalePendingForRehydrate returns pending rows older than STALE_THRESHOLD_MS', async () => {
    const staleRow = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'stale' },
      NOW_ZERO,
    );
    const freshRow = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'fresh' },
      NOW_ZERO + 10_000,
    );

    // NOW = NOW_ZERO + STALE_THRESHOLD_MS + 1  →  staleRow at threshold-
    // edge, freshRow well within the alive window.
    const stale = await loadStalePendingForRehydrate(NOW_ZERO + STALE_THRESHOLD_MS + 1);
    const staleIds = stale.map((r) => r.clientMsgId);
    expect(staleIds).toContain(staleRow.clientMsgId);
    expect(staleIds).not.toContain(freshRow.clientMsgId);
  });

  it('loadStalePendingForRehydrate excludes sent + failed rows even when aged', async () => {
    const sentRow = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'sent' },
      NOW_ZERO,
    );
    await applyMarkSent(sentRow.clientMsgId, NOW_ZERO);
    const failedRow = await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'failed' },
      NOW_ZERO + 100,
    );
    // Drive the failedRow to TERMINAL failed via 5× applyMarkFailed
    // (1 call → attempts=1, still pending with backoff; calls 2-5
    // each increment attempts; the 5th call hits attempts = MAX,
    // so state flips to terminal 'failed').
    await applyMarkFailed(failedRow.clientMsgId, 'err1', NOW_ZERO + 200);
    await applyMarkFailed(failedRow.clientMsgId, 'err2', NOW_ZERO + 300);
    await applyMarkFailed(failedRow.clientMsgId, 'err3', NOW_ZERO + 400);
    await applyMarkFailed(failedRow.clientMsgId, 'err4', NOW_ZERO + 500);
    await applyMarkFailed(failedRow.clientMsgId, 'err5', NOW_ZERO + 600);

    const stale = await loadStalePendingForRehydrate(NOW_ZERO + STALE_THRESHOLD_MS * 10);
    expect(stale).toEqual([]);
  });

  it('loadStalePendingForRehydrate returns empty when no pending rows exist', async () => {
    await enqueue(
      { conversationId: 'conv-A', senderId: 'user-1', kind: 'text', body: 'x' },
      NOW_ZERO,
    );
    // NOW is well within the alive window.
    const stale = await loadStalePendingForRehydrate(NOW_ZERO + 1_000);
    expect(stale).toEqual([]);
  });

  it('STALE_THRESHOLD_MS equals 5 * 60_000 (regression guard for M5-3 architecture decisions)', () => {
    expect(STALE_THRESHOLD_MS).toBe(300_000);
  });

  it('applyMarkStaleOnStartup on missing PK returns null (defensive)', async () => {
    expect(
      await applyMarkStaleOnStartup('00000000-0000-4000-8000-000000000000'),
    ).toBeNull();
  });
});
