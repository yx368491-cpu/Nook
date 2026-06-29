/**
 * M5-3 — Startup rehydrate sweep.
 *
 * Brief
 * -----
 * On app boot, scan the local Dexie outbox for `pending` rows
 * whose `createdAt` is older than `STALE_THRESHOLD_MS` (5 minutes)
 * and apply the `markStale` reducer to each. These rows are
 * "victims of an app restart during an outage" — the user closed
 * or backgrounded the app mid-retry, and on reopen the network is
 * still down (or the SW already gave up its retry budget). Without
 * this sweep, the user would see a phantom yellow dot forever
 * and no failure toast / reconnecting strip.
 *
 * Why a module plain function (not a React hook)
 * ----------------------------------------------
 * Same pattern as M5-2's `registerServiceWorkerOnce`:
 *
 *   - React 18 StrictMode double-invokes `useEffect` in dev, so a
 *     hook-based variant would re-scan Dexie (cheap) but ALSO
 *     call `applyMarkStaleOnStartup` twice on the SAME row —
 *     a no-op thanks to the `markStale` defensive guard, but
 *     still wasteful and confusing in logs.
 *
 *   - Rehydrate is a global storage-layer invariant, not a React
 *     lifecycle event. Wiring it in `main.tsx` next to the SW
 *     register call keeps all "boot-time infrastructure" calls
 *     in one easily-auditable section.
 *
 *   - The function is fire-and-forget at the call site; its
 *     promise is intentionally NOT awaited (`void
 *     rehydrateOutboxOnStartup()`). The first paint must NOT
 *     block on a Dexie scan.
 *
 * Singleton guard
 * ---------------
 * Module-level `_rehydratedOnce` short-circuits any repeated
 * invocation (defensive against React StrictMode dev re-mount,
 * HMR re-execution, and buggy call sites). Tests reset it via
 * `__resetRehydrateOnceForTests()` — exported by name with the
 * `__` prefix to mirror `__resetDbForTests()` convention from
 * `lib/db/schema.ts`.
 *
 * Race with Workbox BG sync
 * -------------------------
 * Decision 3 of the M5-3 architecture review: the 5-minute
 * threshold is the entire race-defence. SW bg sync's full retry
 * budget is `≤ 5 * 60 s = 5 min`, so a row older than 5 min
 * is DEFINITIVELY not in flight anywhere — rehydrate can safely
 * terminal-fail it without colliding with a concurrent SW
 * replay. If SW later succeeds on a younger in-flight row,
 * `applyMarkSent` no-ops the failure (terminal guard in
 * `markSent`).
 *
 * Idempotency on the same row
 * ---------------------------
 * `markStale` reducer no-ops on already-terminal rows. The
 * singleton guard prevents re-calls in the same process. A
 * subsequent boot cycle (e.g. user kills + reopens the app)
 * correctly skips already-failed rows: their `createdAt` is
 * old but their `state` is `failed` (not `pending`), so the
 * `loadStalePendingForRehydrate` Dexie query by
 * `[state+createdAt][['pending', 0]..['pending', cutoff]]` does
 * not return them.
 */

import {
  loadStalePendingForRehydrate,
  applyMarkStaleOnStartup,
} from '@/lib/db/outbox';

/**
 * Module-level singleton: short-circuits any repeated boot
 * invocation within the same JS process. Cleared by
 * `__resetRehydrateOnceForTests()` between specs.
 */
let _rehydratedOnce = false;

/**
 * Public result of one rehydrate sweep. `staleCount` is the
 * number of pending rows the scan surfaced (pre-fan-out);
 * `markedFailedCount` is the number of rows whose
 * `applyMarkStaleOnStartup` actually wrote a `failed`
 * transition (excludes defensive no-ops on stale-row lookups).
 *
 * Both are exposed primarily for test assertions; production
 * callers may log them under a `console.info` if desired (not
 * done by default — log noise vs. a normal-app helpful signal
 * tradeoff).
 */
export interface RehydrateResult {
  staleCount: number;
  markedFailedCount: number;
}

/**
 * Module-level vanilla function: scan Dexie for stale pending
 * outbox rows; for each, call `applyMarkStaleOnStartup`.
 *
 * Fire-and-forget. Module-level singleton guard. Returns
 * `{staleCount, markedFailedCount}` for testability / future
 * telemetry.
 *
 * Errors from the Dexie scan or any individual
 * `applyMarkStaleOnStartup` are NOT swallowed — they
 * propagate to the caller's `.catch()` (which logs a console
 * warning). Partial-failure state is possible (some rows
 * marked, others failed mid-fan-out) but each row's
 * transition is independent — surviving rows stay as-is
 * for the NEXT boot to find, so we don't need transactional
 * rehydrate.
 */
export async function rehydrateOutboxOnStartup(): Promise<RehydrateResult> {
  if (_rehydratedOnce) {
    return { staleCount: 0, markedFailedCount: 0 };
  }
  _rehydratedOnce = true;

  const staleRows = await loadStalePendingForRehydrate();

  if (staleRows.length === 0) {
    return { staleCount: 0, markedFailedCount: 0 };
  }

  // Fan-out: one Dexie write per row. NOT a single
  // transaction so an individual `applyMarkStaleOnStartup`
  // failure (extremely unlikely — it just `get` + `put`s a
  // local row) does not roll back the rest. The user-visible
  // outcome (a `failed` row appearing) is more important than
  // microsecond-perfect atomicity.
  let markedFailedCount = 0;
  for (const row of staleRows) {
    const result = await applyMarkStaleOnStartup(row.clientMsgId);
    if (result !== null) {
      markedFailedCount += 1;
    }
  }
  return { staleCount: staleRows.length, markedFailedCount };
}

/**
 * Test-only export — clears the module-level singleton so
 * the next `rehydrateOutboxOnStartup()` runs a real sweep.
 * Mirrors the `__resetDbForTests()` convention from
 * `lib/db/schema.ts`.
 */
export function __resetRehydrateOnceForTests(): void {
  _rehydratedOnce = false;
}

/**
 * Test-only export — peek the current singleton state.
 * Useful for asserting "second call short-circuited".
 */
export function __getRehydrateOnceForTests(): boolean {
  return _rehydratedOnce;
}
