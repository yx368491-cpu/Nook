/**
 * M5-1 — Outbox state machine for AC.17 (offline / weak-network
 * message replay).
 *
 * Mirror of SPEC § 7 DR-10 warm + F-MEDIA-01 + ADR-014. Each outbox
 * row traces ONE client_msg_id through FOUR states:
 *
 * ┌─────────┐    enqueue()      ┌─────────┐   markSending()   ┌─────────┐
 * │ (none)  │  ────────►   │ pending │ ──────────────► │ sending │
 * └─────────┘                  └─────────┘                  └─────────┘
 *                                  │  markFailed()           │
 *                                  │  (attempts < MAX)       │ markSent()
 *                                  ▼                         ▼
 *                          ┌─────────┐                ┌─────────┐
 *                          │ (retry) │                │  sent   │ ──► purged
 *                          └─────────┘                └─────────┘  after 30 min
 *                                  │  attempts ≥ MAX
 *                                  ▼
 *                              ┌─────────┐
 *                              │ failed  │ (terminal; user-visible)
 *                              └─────────┘
 *
 * The state machine is shipped as **pure reducer functions** in
 * addition to (later) **mutator functions** against Dexie. The pure
 * reducers are 100% side-effect-free and trivially testable in unit
 * specs — see `outbox.test.ts`. The mutators are a thin Dexie glue
 * layer that maps reducer events to Dexie `outbox.put()` writes so
 * callers (SW bg sync, future SW replay, app-level auto-replay hook)
 * can use them in a transaction.
 *
 * Scope discipline (M5-1 = foundation only; M5-2 = send rewire + SW):
 *   - This file ships pure reducers + happy-path Dexie wrappers.
 *   - The actual `enqueueOnFailure()` call site in useSendMessage is
 *     deferred to M5-2. M5-1 only guarantees the FOUNDATION — ship
 *     the data model, state machine, backoff math, and observer
 *     hook. The send hook will swap to outbox-first in M5-2 alongside
 *     Workbox SW registration + background sync.
 *   - Attachment Blob storage in outbox is deferred to M5-4/5/7 —
 *     M5-1 ships `body: string | null` only for `kind='text'`. The
 *     `attachmentMeta` placeholder is reserved for future.
 */

import { getDb, type NookOutboxRow } from '@/lib/db/schema';
import { generateClientMsgId } from '@/lib/db/client_msg_id';

// ===========================================================================
// Constants — all tunable by v1.1+ data, but locked for M5-1 launch
// ===========================================================================

/**
 * Exponentially increasing retry backoff. After `attempts` failures,
 * a row waits `RETRY_BACKOFF_BASE_MS * 2^(attempts-1)` ms before its
 * next attempt (capped at `RETRY_BACKOFF_CAP_MS`).
 *
 * Schedule (default base = 1s):
 *   attempts=1 → ~1s
 *   attempts=2 → ~2s
 *   attempts=3 → ~4s
 *   attempts=4 → ~8s
 *   attempts=5 → ~16s (last attempt, after which the row is `failed`)
 *
 * Cap of 60s is intentionally below the user-perceived "this thing
 * glitched" threshold (~2 min). Future pessimistic users or server
 * 503s should not silently extend the retry window beyond 1 minute.
 */
export const RETRY_BACKOFF_BASE_MS = 1_000;
export const RETRY_BACKOFF_CAP_MS = 60_000;

/**
 * Hard cap on the number of attempts before a row transitions to
 * `failed`. After `MAX_ATTEMPTS`, the row stops retrying and the UI
 * surfaces it as a permanent "needs attention" state. v1.1+ may
 * surface a "retry manually" affordance per M5-5 follow-up.
 *
 * 5 attempts = ~31s total elapsed (1+2+4+8+16) → exits to `failed`.
 */
export const MAX_ATTEMPTS = 5;

/**
 * Grace window after `sentAt`. Rows transition through `sent` for
 * this duration so a delayed Realtime echo or accidental replay can
 * NOT double-send (the duplicate is observed and discarded at the
 * Dexie PK collision check). After the grace window, the row is
 * purged by `purgeSentBefore(graceWindowEnd)` called from a SW bg
 * sync hook (deferred to M5-2) or the app-level auto-replay hook
 * (deferred to M5-2/M5-5).
 *
 * 30 min covers:
 *   - Realtime worst-case reconnect latency (NF-PERF-04: < 3s)
 *   - User manually retries in another tab (typical cross-tab window)
 *   - 30-day TTL won't fire on these rows (they're local only)
 */
export const SENT_GRACE_MS = 30 * 60 * 1_000;

// ===========================================================================
// Types
// ===========================================================================

/**
 * The four canonical outbox states. Exhaustive; type-narrowed in the
 * reducer functions below.
 *
 * `pending`   — enqueued, not yet attempted (or mid-backoff window)
 * `sending`   — actively being POSTed (transient; should be very brief)
 * `sent`      — server has acked; row retained for SENT_GRACE_MS
 *               to observe duplicate replays, then purged
 * `failed`    — MAX_ATTEMPTS reached; terminal, user-visible
 *
 * Note: archived `delivered` from ADR-014 § 10.2 — we collapsed
 * it into `sent` per M5-1 design. The duplicate-detection window is
 * orthogonal (handled by Dexie PK + server partial unique index).
 */
export type OutboxState = 'pending' | 'sending' | 'sent' | 'failed';

/**
 * `nowMs()` — wall-clock wrapper around `Date.now()` for use as the
 * default `now` argument to pure reducer functions.
 *
 * The single-letter name `NOW` was rejected after review because it
 * reads like a date-format string when scanning the reducer bodies.
 * `nowMs` is intentionally typed and short.
 */
const nowMs = (): number => Date.now();

/**
 * Public row shape persisted by the outbox table. Mirror of
 * `NookOutboxRow` minus the PK access path aliasing. We EXPORT this
 * as the cross-module shape so the schema module can keep its Dexie
 * generic narrowing while consumers (useOutbox hook, etc.) work
 * with the same shape regardless of Dexie ergonomics.
 */
export interface OutboxRow {
  clientMsgId: string;
  conversationId: string;
  senderId: string;
  kind: 'text' | 'image' | 'file';
  body: string | null;
  replyToId: string | null;
  state: OutboxState;
  attempts: number;
  lastAttemptAt: number | null;
  nextAttemptAt: number | null;
  sentAt: number | null;
  failedAt: number | null;
  lastError: string | null;
  /** Epoch ms */
  createdAt: number;
  /** Epoch ms; updated on every reducer pass */
  updatedAt: number;
}

/**
 * Input contract for `enqueue()`. Only the message metadata is
 * required — state machine fields start at their "just-enqueued"
 * defaults. This is the M5-1 happy path for `text` messages.
 *
 * For `image`/`file` kinds we accept an optional `attachmentMeta`
 * placeholder; the actual Blob serialization is deferred to M5-4/5/7
 * (when offline image compression / sync lands).
 */
export interface EnqueueInput {
  conversationId: string;
  senderId: string;
  kind: 'text' | 'image' | 'file';
  body: string | null;
  replyToId?: string | null;
  /** Optional — caller can pass an existing UUID for symmetric
   *  client_msg_id dedupe (used by the M5-2 SW replay path). */
  clientMsgId?: string;
}

// ===========================================================================
// Pure reducer functions (NO side effects, NO Dexie writes)
// ===========================================================================

/**
 * Compute the wall-clock delay until the row can be retried.
 *
 * `@param attempts` — number of failures already happened (caller passes
 *                     `row.attempts` representing attempts already done;
 *                     this returns the delay for `attempts+1`-th attempt).
 *
 * `@returns delayMs` — wall-clock ms to wait before attempting again.
 *
 * Examples (base 1s, cap 60s):
 *   backoffMsFor(0) → 1000ms  (next attempt after 0 failures)
 *   backoffMsFor(1) → 2000ms  (next attempt after 1 failure)
 *   backoffMsFor(2) → 4000ms  (next attempt after 2 failures)
 *   backoffMsFor(3) → 8000ms  (next attempt after 3 failures)
 *   backoffMsFor(4) → 16000ms (next attempt after 4 failures — last)
 *   backoffMsFor(5) → 32000ms (not used — MAX_ATTEMPTS=5 stops here)
 *   backoffMsFor(10) → 60000ms (cap)
 *
 * The function clamps the exponent to keep the calculation arithmetic
 * safe even if a future caller passes a pathological value.
 */
export function backoffMsFor(attempts: number): number {
  const safeAttempts = Math.max(0, Math.min(attempts, 20));
  const exp = Math.min(safeAttempts, Math.log2(RETRY_BACKOFF_CAP_MS / RETRY_BACKOFF_BASE_MS) + 1);
  return Math.min(
    RETRY_BACKOFF_BASE_MS * 2 ** exp,
    RETRY_BACKOFF_CAP_MS,
  );
}

/**
 * Pure transition: a fresh outbox row. State starts at 'pending'
 * with `attempts=0`, no prior attempt timestamps, no error.
 */
export function initOutboxRow(
  input: EnqueueInput,
  now: number = nowMs(),
): OutboxRow {
  const clientMsgId = input.clientMsgId ?? generateClientMsgId();
  return {
    clientMsgId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    kind: input.kind,
    body: input.body,
    replyToId: input.replyToId ?? null,
    state: 'pending',
    attempts: 0,
    lastAttemptAt: null,
    nextAttemptAt: null,
    sentAt: null,
    failedAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Pure transition: marking a row as 'sending' (transient state).
 *
 * Per the state machine diagram, `pending → sending` is the only
 * valid transition. If the caller passes an already-sent or failed
 * row, we intentionally do NOT mutate the state — the caller has a
 * bug and the row is not for sending. We still update `updatedAt` so
 * the change is observable.
 */
export function markSending(row: OutboxRow, now: number = nowMs()): OutboxRow {
  if (row.state === 'sent' || row.state === 'failed') {
    return { ...row, updatedAt: now };
  }
  return {
    ...row,
    state: 'sending',
    lastAttemptAt: now,
    nextAttemptAt: null,
    updatedAt: now,
  };
}

/**
 * Pure transition: row successfully delivered to the server.
 *
 * `sending → sent` is the canonical. `pending → sent` is a defensive
 * shortcut for callers that bypassed `markSending` (e.g. sync tests).
 * `sent → sent` and `failed → sent` are bugs in the caller; we no-op.
 */
export function markSent(row: OutboxRow, now: number = nowMs()): OutboxRow {
  if (row.state === 'pending' || row.state === 'sending') {
    return {
      ...row,
      state: 'sent',
      sentAt: now,
      lastAttemptAt: now,
      lastError: null,
      updatedAt: now,
    };
  }
  return { ...row, updatedAt: now };
}

/**
 * Pure transition: a sending attempt failed. The reducer decides
 * whether the row stays 'pending' (with a backoff window) or moves
 * to terminal 'failed' (when MAX_ATTEMPTS is exceeded).
 *
 * Failure semantics:
 *   - attempts += 1 (this attempt counts now)
 *   - lastAttemptAt = now
 *   - nextAttemptAt = now + backoffMsFor(attempts)
 *   - lastError = the caller's message (truncated to 500 chars)
 *
 * If `attempts >= MAX_ATTEMPTS`, the row transitions to 'failed'
 * instead of 'pending' — UI surfaces it as "needs attention".
 */
export function markFailed(
  row: OutboxRow,
  error: string,
  now: number = nowMs(),
): OutboxRow {
  // Defensive no-op: once a row is terminal (`sent`/`failed`), a late
  // failure signal from a duplicate replay must NOT mutate the row.
  // The duplicate-detection contract is already enforced by the Dexie
  // PK + server partial unique index from ADR-014; this guard keeps
  // the reducer symmetric with `markSending`/`markSent`.
  if (row.state === 'sent' || row.state === 'failed') {
    return { ...row, updatedAt: now };
  }
  const clampedError = error.length > 500 ? error.slice(0, 500) : error;
  const nextAttempts = row.attempts + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    return {
      ...row,
      state: 'failed',
      attempts: nextAttempts,
      lastAttemptAt: now,
      nextAttemptAt: null,
      failedAt: now,
      lastError: clampedError,
      updatedAt: now,
    };
  }
  return {
    ...row,
    state: 'pending',
    attempts: nextAttempts,
    lastAttemptAt: now,
    nextAttemptAt: now + backoffMsFor(nextAttempts),
    lastError: clampedError,
    updatedAt: now,
  };
}

// ===========================================================================
// Dexie mutators (thin wrappers around pure reducers)
// ===========================================================================

/**
 * Persist a fresh outbox row. Idempotent on `clientMsgId` — a
 * duplicate enqueue with the same ID replaces the existing row
 * rather than crashing (Dexie `put` semantics up the chain).
 */
export async function enqueue(
  input: EnqueueInput,
  now: number = nowMs(),
): Promise<OutboxRow> {
  const row = initOutboxRow(input, now);
  await getDb().outbox.put(row as NookOutboxRow);
  return row;
}

/**
 * Apply the `markSending` pure reducer to a row persisted at
 * `clientMsgId`. Returns the new row (caller can react to the
 * transition without a separate read).
 */
export async function applyMarkSending(
  clientMsgId: string,
  now: number = nowMs(),
): Promise<OutboxRow | null> {
  const db = getDb();
  const existing = await db.outbox.get(clientMsgId);
  if (!existing) return null;
  const next = markSending(existing, now);
  await db.outbox.put(next as NookOutboxRow);
  return next;
}

/**
 * Apply the `markSent` pure reducer to a row persisted at
 * `clientMsgId`. Idempotent on re-call (no-op when already sent).
 */
export async function applyMarkSent(
  clientMsgId: string,
  now: number = nowMs(),
): Promise<OutboxRow | null> {
  const db = getDb();
  const existing = await db.outbox.get(clientMsgId);
  if (!existing) return null;
  const next = markSent(existing, now);
  await db.outbox.put(next as NookOutboxRow);
  return next;
}

/**
 * Apply the `markFailed` pure reducer to a row persisted at
 * `clientMsgId`. Returns the new (or unchanged terminal) row.
 */
export async function applyMarkFailed(
  clientMsgId: string,
  error: string,
  now: number = nowMs(),
): Promise<OutboxRow | null> {
  const db = getDb();
  const existing = await db.outbox.get(clientMsgId);
  if (!existing) return null;
  const next = markFailed(existing, error, now);
  await db.outbox.put(next as NookOutboxRow);
  return next;
}

/**
 * Bulk purge: remove all `sent` rows whose `sentAt + SENT_GRACE_MS`
 * has elapsed. Called from a periodic SW bg sync hook (M5-2) and
 * the future app-level auto-replay hook.
 *
 * Returns the count of purged rows for telemetry / logging.
 */
export async function purgeSentBefore(now: number = nowMs()): Promise<number> {
  const db = getDb();
  const cutoff = now - SENT_GRACE_MS;
  const stale = await db.outbox
    .where('state').equals('sent')
    .and((row) => row.sentAt !== null && row.sentAt < cutoff)
    .toArray();
  await db.outbox.bulkDelete(stale.map((r) => r.clientMsgId));
  return stale.length;
}

/**
 * Lookup — read a single row by client_msg_id. Useful for SW
 * replay dedupe checks against the previous optimistic patch.
 */
export async function getOutboxRow(
  clientMsgId: string,
): Promise<OutboxRow | null> {
  const row = await getDb().outbox.get(clientMsgId);
  return row ?? null;
}

/**
 * Lookup — read all rows for one conversation, ordered by
 * `createdAt ASC` (FIFO). Used by the useOutbox hook for the per-row
 * "yellow dot" rendering.
 */
export async function listOutboxForConversation(
  conversationId: string,
): Promise<OutboxRow[]> {
  return getDb().outbox
    .where('conversationId').equals(conversationId)
    .sortBy('createdAt');
}

// ===========================================================================
// M5-3 — Startup rehydrate (app-restart-during-outage recovery)
// ===========================================================================

/**
 * Canonical sentinel `lastError` written by `markStale` so any UI
 * layer (Composer reconnecting strip, future outbox toast) can
 * filter "this failed because the app was offline at restart"
 * from "this failed because of a network error mid-send"
 * WITHOUT string-matching magic. Exported so the future UI
 * extension in M5-5/M5-6 doesn't `row.lastError === 'app-restart…'`
 * against a typo-prone literal.
 */
export const STALE_RESTART_SENTINEL = 'app-restart-during-outage';

/**
 * Threshold after which a still-`pending` row is considered a
 * "victim of an app restart during an outage" and should be
 * surfaced to the user as terminal `failed`. Workbox BG sync's
 * total retry window is at most 5 backoff rounds × 60 s cap
 * ≈ 5 minutes, so anything older than 5 minutes is definitively
 * NOT in flight.
 *
 * 5 minutes strikes a balance:
 *   - Long enough to absorb the longest possible BG sync retry
 *     so a race with the SW replay path cannot falsely fail
 *     (decision 3 of M5-3 architecture review).
 *   - Short enough that a user who reopens the app ~5 minutes
 *     after a network outage sees the reconnecting strip /
 *     toast promptly, instead of a phantom yellow dot.
 *
 * Tuned by v1.0.1 telemetry: if false-positive "stale" rows
 * appear (SW was still retrying), bump to 600_000 (10 min). If
 * users complain about "kept the dots too long", drop to 180_000
 * (3 min).
 */
export const STALE_THRESHOLD_MS = 5 * 60_000;

/**
 * Pure transition: mark a pending row as terminal `failed` due to
 * "app restart during an outage". Bypasses the normal
 * `attempts++` path because rehydrate is a meta-event, NOT
 * another send attempt — the SW / network already had their
 * fair retry budget (see `STALE_THRESHOLD_MS` rationale).
 *
 * Semantics:
 *   - state:       'failed' (terminal; UI surfaces it)
 *   - attempts:    MAX_ATTEMPTS (so the row's UI badge is "give up"
 *                  not "trying")
 *   - failedAt:    now
 *   - lastError:   'app-restart-during-outage' (canonical string
 *                  the UI / future telemetry filter by)
 *   - nextAttemptAt: null (no scheduled retry — this is terminal)
 *
 * Defensive no-op on already-terminal rows (`sent` / `failed`)
 * symmetric with `markSending` / `markFailed`. A duplicate
 * rehydrate call on the same row is a no-op (state / failedAt /
 * lastError stay).
 */
export function markStale(row: OutboxRow, now: number = nowMs()): OutboxRow {
  if (row.state === 'sent' || row.state === 'failed') {
    return { ...row, updatedAt: now };
  }
  return {
    ...row,
    state: 'failed',
    attempts: MAX_ATTEMPTS,
    lastAttemptAt: now,
    failedAt: now,
    nextAttemptAt: null,
    lastError: STALE_RESTART_SENTINEL,
    updatedAt: now,
  };
}

/**
 * Apply the `markStale` pure reducer to a row persisted at
 * `clientMsgId`. Returns the new (or unchanged terminal) row,
 * or `null` if the PK did not exist (defensive for stale
 * callers).
 *
 * M5-3 boot-time rehydrate fan-out calls this once per stale
 * row found by `loadStalePendingForRehydrate()`.
 */
export async function applyMarkStaleOnStartup(
  clientMsgId: string,
  now: number = nowMs(),
): Promise<OutboxRow | null> {
  const db = getDb();
  const existing = await db.outbox.get(clientMsgId);
  if (!existing) return null;
  const next = markStale(existing, now);
  await db.outbox.put(next as NookOutboxRow);
  return next;
}

/**
 * Scan — return every `pending` row whose `createdAt` is older
 * than `STALE_THRESHOLD_MS`. Used by the M5-3 startup rehydrate
 * hook to identify rows that need to be surfaced as terminal
 * `failed`.
 *
 * Indexed path: leverages the `[state+createdAt]` compound index
 * so a single Dexie range scan returns the rows without an
 * in-memory filter. Both bounds are inclusive — rows exactly at
 * the cutoff ARE stale.
 *
 * NOT scoped to one conversation: rehydrate is a global
 * "find all victims of the latest outage" sweep across the
 * entire user's outbox. Per-conversation attackers don't exist
 * (local-only outbox); per-user outages (airplane mode, server
 * down) affect every conv.
 */
export async function loadStalePendingForRehydrate(
  now: number = nowMs(),
): Promise<OutboxRow[]> {
  const cutoff = now - STALE_THRESHOLD_MS;
  return getDb().outbox
    .where('[state+createdAt]')
    .between(['pending', 0], ['pending', cutoff], true, true)
    .toArray() as Promise<OutboxRow[]>;
}
