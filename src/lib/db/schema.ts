import Dexie, { type EntityTable } from 'dexie';

import type { OutboxRow } from '@/lib/db/outbox';
// M5-4 — attachment blob cache row type. Distinct from the server
// `attachments` table; this is the LOCAL Chromium IDB cache used to
// serve image bubbles offline + via viewer cache (when Workbox HTTP
// cache misses) without re-fetching from the signed URL.
//
// Note: `AttachmentTable` (the Dexie EntityTable<T, 'id'> alias) is
// declared IN THIS MODULE — schema.ts owns the typed-table alias for
// any consumers that need it. The classic Nook convention keeps typed
// tables next to the database class (which IS here); pair with the
// `useAttachments` consumers that import `AttachmentRow` from
// `attachments` (the data module).
import type { AttachmentRow } from '@/lib/db/attachments';

/**
 * M5-1 — Dexie schema v1 (`nook_outbox_v1` IndexedDB database).
 *
 * Single IndexedDB holds the **outbox** foundation that future M5-2
 * (Service Worker background sync) and M5-5 (Dexie messages cache
 * warm layer) will both write to / read from. Per ADR-014, the Warm
 * cache tier is IndexedDB via Dexie.
 *
 * Schema policy (per `Nook-CODING-STANDARDS.md`):
 *   - PK = string UUID (no auto-increment int — would conflict with
 *     client_msg_id UUIDs and prevent server-side dedupe
 *   - Indexes are explicitly enumerated in the `stores()` call —
 *     Dexie v4 does NOT auto-index non-PK columns
 *   - Compound indexes use `[a+b]` naming for FIFO sort patterns
 *
 * Lifecycle policy:
 *   - 'sent' rows are KEPT for 30 minutes after `sentAt` so the
 *     repeated Realtime echo or accidental replay cannot double-send;
 *     a future M5-2 hook purges them via `purgeSentBefore(graceWindowEnd)`
 *     (sibling helper in `outbox.ts`)
 *   - 'failed' rows are KEPT indefinitely so the user can see WHY
 *     a message never went through (UI extension in M5-5/M5-6)
 *
 * Migration discipline:
 *   - `db.version(2).stores(...)` will be the upgrade path; NEVER
 *     modify v1 in place — instead bump `.version(2)` then
 *     `.upgrade(tx => ...)` with the schema diff. ADR-014 confirms
 *     Dexie auto-version management ships M5.
 */
export interface NookOutboxRow extends OutboxRow {
  /** PK: client_msg_id (UUID v4, see client_msg_id.ts) */
  clientMsgId: string;
}

/**
 * Dexie table type for the outbox. PK is `clientMsgId` (string).
 *
 * Indexes (declared above in `this.version(1).stores(...)`):
 *   - `conversationId`     — query "show me this room's outbox"
 *   - `state`               — query "pending rows" / "failed rows"
 *   - `createdAt`           — FIFO replay order
 *   - `[state+createdAt]`   — compound for "pending + FIFO" scans in
 *                            one index read (no multi-scan concat)
 *   - `nextAttemptAt`       — SW / app-level "what's due to retry now?"
 *
 * We deliberately do NOT index `senderId`, `replyToId`, or `kind` —
 * those are present on the row for projection but never drive
 * queries at this layer (server-side constraints / RLS handle those).
 *
 * Note: callers issue index queries via Dexie's `.where('name').equals(v)`
 * pattern (the standard chainable IDB query API). We deliberately do
 * NOT short-name the queries as custom Table methods — the `EntityTable`
 * generic exposes only the standard Dexie surface; declaring phantom
 * methods on the intersection type would be a TypeScript lie that
 * would crash at runtime when invoked.
 */
export type OutboxTable = EntityTable<NookOutboxRow, 'clientMsgId'>;

// ===========================================================================
// M5-4 — Attachment blob cache (offline-first image loads)
// ===========================================================================
//
// Separate Dexie table for the LOCAL attachment blob cache. The cache is
// shared across both self-sent uploads (M5-4 composer path) and recipient
// image views (M5-4 viewer path), keyed by the SERVER `attachments.id`
// (UUID v4) so the same pipeline serves both.
//
// Why TWO tables (not one outbox-extension)?
//   - Outbox rows are short-lived metadata (state machine + dedupe + ack);
//     their lifecycle is wholly distinct from the blob cache (LRU + quota).
//   - Blobs are LARGE (multi-MB) — sharing a table would (a) inflate the
//     outbox JSON listing cost, (b) force every outbox consumer to know
//     about Blob ergonomics, (c) preclude separate quota policies.
//   - The future v1.1 "attachment re-send" feature (where a recipient's
//     image is forwarded) reuses THIS table, not the outbox — so v2.
//     schema generalization cost is lower than v1.1 migration cost.
// ===========================================================================

/**
 * Dexie table type for the local attachment blob cache. PK is `id`
 * (the server-side `attachments.id` UUID v4 — same value used to fetch
 * the signed URL from supabase).
 *
 * The table row type IS `AttachmentRow` directly (NOT `Omit<…,'id'>`).
 * Dexie's `EntityTable<T, 'id'>` requires `'id'` to be in `keyof T`;
 * if we omit it, the type system reads the PK as a NEW key, breaking
 * `.get(id)` / `.put(row)` / `.bulkDelete(ids)` overloads. Using the
 * flat row type keeps the PK in the row schema's perspective.
 *
 * Indexes:
 *   - `conversationId`                       — query "all blobs in this conv"
 *   - `lastAccessedAt`                       — single-column for LRU sweeps
 *   - `[conversationId+lastAccessedAt]`      — "LRU within one conv"
 *   - `expiresAt`                            — time-based TTL purge (manual)
 */
export type AttachmentTable = EntityTable<AttachmentRow, 'id'>;



/**
 * The Dexie database singleton. Open at the top of the module so
 * eager initialization happens on the first import of any `lib/db/*`
 * consumer (useOutbox, outbox state machine, future SW bootstrap).
 *
 * NOTE: in jsdom test env, Dexie's underlying IDBAPI is replaced
 * with `fake-indexeddb` via `tests/setup.ts`. In production, the
 * real `indexedDB` global (window-scoped) is used.
 */
export class NookOutboxDb extends Dexie {
  outbox!: OutboxTable;
  // M5-4 — separate Dexie table for the local attachment blob cache.
  // NOT covered by `OutboxTable`'s typing; queries on the `attachments`
  // table go through this property via EntityTable's standard surface.
  attachments!: AttachmentTable;

  constructor(databaseName = 'nook_outbox_v1') {
    super(databaseName);

    // ========================================================================
    // v1 schema — KEEP INDEFINITELY for migration compat. An existing
    // v1 client's IDB is auto-upgraded to v2 (no data loss for the
    // `outbox` table because the v2 spec re-declares the same `outbox`
    // indices verbatim).
    // ========================================================================
    this.version(1).stores({
      // PK + indexes. Compound [state+createdAt] enables a single
      // indexed range scan for "oldest pending row" reads (used by
      // SW bg sync replay + future app-level auto-replay hook).
      outbox:
        '&clientMsgId, conversationId, state, createdAt, ' +
        '[state+createdAt], nextAttemptAt',
    });

    // ========================================================================
    // M5-4 — v2 schema adds the LOCAL attachment blob cache table.
    // Indexed by server `attachments.id` so the same key serves both
    // self-sent uploads (after the INSERT attachments row arrives)
    // AND recipient image views (after first signed-URL fetch).
    //
    // Indexes match the LRU policy:
    //   - `lastAccessedAt` — single-column sort for full-DB LRU sweeps
    //   - `[conversationId+lastAccessedAt]` — LRU within one conv
    //   - `expiresAt` — manual time-based TTL purge (a future v1.1 quota
    //     UI hook calls `lruPurgeUntilUnder()` on this column)
    //
    // We deliberately do NOT index `mime`, `sizeBytes`, or `uploadedBy`
    // — those are present on the row for projection but never drive
    // queries at this layer.
    // ========================================================================
    this.version(2).stores({
      outbox:
        '&clientMsgId, conversationId, state, createdAt, ' +
        '[state+createdAt], nextAttemptAt',
      attachments:
        '&id, conversationId, lastAccessedAt, expiresAt, ' +
        '[conversationId+lastAccessedAt]',
    });
  }
}

/**
 * Module singleton — lazy-initialized so test modules that import
 * this file BEFORE polyfill injection (e.g. cross-test file load
 * ordering) don't crash on the missing global. The actual `Dexie`
 * open typically completes in < 5 ms; callers don't await the
 * connection.
 *
 * In jsdom + fake-indexeddb tests, `tests/setup.ts` runs
 * `import 'fake-indexeddb/auto'` BEFORE any spec module loads so
 * `indexedDB` is defined by the time `getDb()` runs `.open()`.
 */
let _db: NookOutboxDb | null = null;

export function getDb(): NookOutboxDb {
  if (_db === null) {
    _db = new NookOutboxDb();
  }
  return _db;
}

/**
 * Test-only: drop the underlying IndexedDB schema AND null the
 * singleton between specs. NEVER call this from production code.
 *
 * Just closing the Dexie connection is NOT enough — the underlying
 * IDB database persists across `db.close()` if the test runner
 * reuses the jsdom VM. We must:
 *   1. Close the Dexie connection (`db.close()`)
 *   2. Delete the IDB database (`indexedDB.deleteDatabase(name)`)
 *      so any rows written by prior tests are gone
 *   3. Null the singleton so the next `getDb()` opens a fresh connection
 *      that auto-creates the v1 schema from scratch
 *
 * Without step 2, the 8+ schema/outbox tests contaminate each other
 * (e.g. a row inserted by test #1 leaks into test #2's assertions).
 */
export async function __resetDbForTests(
  databaseName = 'nook_outbox_v1',
): Promise<void> {
  if (_db !== null) {
    await _db.close();
    _db = null;
  }
  if (typeof indexedDB !== 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(databaseName);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error('idb delete failed'));
      req.onblocked = () => resolve(); // best-effort; some stores block
    });
  }
}
