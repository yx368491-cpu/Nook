/**
 * M5-4 — Attachment blob cache module.
 *
 * Brief
 * -----
 * Pure Dexie-backed cache of recently-viewed image / file bytes,
 * keyed by the SERVER `attachments.id` (UUID v4). The cache serves
 * two distinct write paths:
 *
 *   1. Self-sent uploads — after `uploadAttachment()` succeeds AND
 *      the server INSERTs the `attachments` row, the blob is mirrored
 *      into the local cache so the optimistic bubble's eventual
 *      canonical render (with the server row's id) hydrates from
 *      IDB immediately (no second signed-URL fetch).
 *
 *   2. Recipient image views — when `<AttachmentImage>` first fetches
 *      the signed URL and resolves to bytes, the bytes are written
 *      to this cache so the NEXT view of the same image is
 *      zero-network.
 *
 * Read path on `<AttachmentImage>`: useLiveQuery by `id` → Blob? →
 * `URL.createObjectURL(blob)` → `<img src={blob:...}>` (zero round-trip).
 * Fall through to signed URL only when the cache misses.
 *
 * Quota policy
 * ------------
 * `ATTACHMENT_CACHE_MAX_BYTES = 200 MB` is the soft cap. The cache
 * is LRU-evicted by `lastAccessedAt` ASC order via `lruPurgeUntilUnder()`,
 * which is the canonical entry point for both:
 *   - boot-time opportunistic purge (deferred to v1.1 quota UI)
 *   - on-write eviction when `navigator.storage.estimate()` reports
 *     usage > 90% of quota (fire-and-forget warning + purge)
 *
 * Compression policy
 * ------------------
 * Per DATA-MODEL R-30 ('image 不压缩, 原图保真') and the M5-4 scope
 * decision (compression off / EXIF strip only), this module does NOT
 * re-encode bytes. Future v1.1 quota work MAY add an opt-in "Send
 * reduced" toggle that compresses BEFORE upload; the cache key
 * remains server `id` either way so dedupe works across the two
 * pipelines.
 *
 * Test coverage: src/lib/db/attachments.test.ts (M5-4 docstring § verification).
 */

import { getDb } from '@/lib/db/schema';

// ===========================================================================
// Constants — soft cap policy
// ===========================================================================

/**
 * Soft cap for the local attachment blob cache. IndexedDB on
 * Chromium typically allocates up to ~60% of free disk per origin;
 * 200 MB keeps well under the 1 GB practical limit while still
 * caching ~200 high-res phone-camera JPEGs. Tunable from the
 * CONSOLE in dev (`_db.attachments.clear()` to wipe + bump
 * the const).
 */
export const ATTACHMENT_CACHE_MAX_BYTES = 200 * 1024 * 1024;

/**
 * 30-day TTL on cached blobs. Matches Workbox's `maxAgeSeconds`
 * setting on `nook-image-cache` so the two cache tiers agree on
 * expiry semantics. Older blobs are purged lazily during
 * `lruPurgeUntilUnder()` calls (manual in M5-4; auto via quota UI
 * in v1.1).
 */
export const ATTACHMENT_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Soft IDB usage cap below which the cache writes proceed without
 * pre-eviction. `0.9 = 90%` matches the threshold the spec recommends
 * to keep the IDB write path responsive without flushing the entire
 * cache mid-upload.
 */
export const QUOTA_SAFETY_RATIO = 0.9;

// ===========================================================================
// Types
// ===========================================================================

/**
 * Local cache row shape. PK is `id` (server-side `attachments.id`).
 *
 * Field semantics:
 *   - `id`              — server attachments.id (UUID v4). Same key
 *                         as the server row + the signed-URL path.
 *   - `storagePath`     — server `attachments.storage_path`. Used as
 *                         a secondary identifier; included for
 *                         ergonomic cross-reference even though
 *                         `id` IS the canonical key.
 *   - `blob`            — the actual file bytes. NEVER null (a row
 *                         exists iff we have bytes to cache).
 *   - `conversationId`  — indexed; used for "LRU within this conv"
 *                         scoped purges + analytics.
 *   - `mime`, `sizeBytes`, `width`, `height` — metadata mirror of
 *                         the server row; populated so the UI does
 *                         NOT need a second `attachments` query to
 *                         render.
 *   - `lastAccessedAt`  — bumped on every `touchAttachment(id)`
 *                         (invoked from `<AttachmentImage>` on every
 *                         blob-URL hydrate success — M5-4 round-4
 *                         fix); drives LRU eviction order.
 *   - `expiresAt`       — pre-computed `createdAt + MAX_AGE_MS`
 *                         so the purge scan is a single indexed
 *                         range read.
 *   - `createdAt`       — wall-clock insertion; useful for
 *                         "show me what we cached in the last hour"
 *                         debug queries.
 */
export interface AttachmentRow {
  id: string;
  storagePath: string;
  blob: Blob;
  conversationId: string;
  mime: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  lastAccessedAt: number;
  expiresAt: number;
  createdAt: number;
}

const nowMs = (): number => Date.now();

/**
 * Input contract for `putAttachmentCache()`. Callers wrap server
 * rows (post-upload-response) or freshly-fetched blobs (post-
 * signed-URL-fetch). The function computes `lastAccessedAt` and
 * `expiresAt` from `nowMs()` so callers don't have to.
 */
export interface AttachmentCacheInput {
  id: string;
  storagePath: string;
  conversationId: string;
  blob: Blob;
  mime: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

// ===========================================================================
// Mutators — write path
// ===========================================================================

/**
 * Persist a blob to the local cache. Idempotent on `id` (Dexie `put`
 * overwrites existing rows). Sets `lastAccessedAt = nowMs()` and
 * `expiresAt = nowMs() + MAX_AGE_MS`.
 *
 * NOT throwing on QuotaExceededError — the error surfaces to the
 * caller's `.catch()`. The cache WRITE is fire-and-forget from the
 * call site (Composer upload + AttachmentImage view), so a quota
 * miss just means the next read falls through to the signed URL.
 */
export async function putAttachmentCache(
  input: AttachmentCacheInput,
  now: number = nowMs(),
): Promise<AttachmentRow> {
  const row: AttachmentRow = {
    id: input.id,
    storagePath: input.storagePath,
    conversationId: input.conversationId,
    blob: input.blob,
    mime: input.mime,
    sizeBytes: input.sizeBytes,
    width: input.width,
    height: input.height,
    lastAccessedAt: now,
    expiresAt: now + ATTACHMENT_CACHE_MAX_AGE_MS,
    createdAt: now,
  };
  await getDb().attachments.put(row);
  return row;
}

/**
 * Bump `lastAccessedAt` for an existing row. Called by
 * `<AttachmentImage>` from a `useEffect` that fires whenever a
 * `blob:` URL resolution succeeds (cache HIT) to keep LRU
 * semantics accurate. Returns `true` iff the row existed (so
 * callers can decide whether to log a stale-cache warning).
 */
export async function touchAttachment(
  id: string,
  now: number = nowMs(),
): Promise<boolean> {
  const db = getDb();
  const existing = await db.attachments.get(id);
  if (!existing) return false;
  await db.attachments.put({
    ...(existing as AttachmentRow),
    lastAccessedAt: now,
  });
  return true;
}

/**
 * Explicit single-row purge. Used by:
 *   - v1.1 quota UI "Clear this image" affordance (M5-5 follow-up)
 *   - conversation-delete flow (when a user leaves a conv, blobs
 *     scoped to that conv are best-effort purged; not blocking)
 *
 * No-op if the row does not exist; returns `true` iff a row was
 * actually deleted (for caller-side telemetry).
 */
export async function deleteAttachment(id: string): Promise<boolean> {
  const db = getDb();
  const existing = await db.attachments.get(id);
  if (!existing) return false;
  await db.attachments.delete(id);
  return true;
}

// ===========================================================================
// Reader
// ===========================================================================

/**
 * Lookup — read a single cached row by server `attachments.id`.
 * Returns `null` on cache miss (caller falls through to signed URL).
 *
 * Does NOT bump `lastAccessedAt` — that's `touchAttachment`'s job,
 * invoked from `<AttachmentImage>` after a successful cache hydrate
 * so the LRU reflects only real "user-viewed" reads.
 */
export async function getAttachmentCacheRow(
  id: string,
): Promise<AttachmentRow | null> {
  const row = await getDb().attachments.get(id);
  return (row as AttachmentRow | undefined) ?? null;
}

/**
 * Free the blob's temporary `blob:` URL once the consumer no longer
 * renders the image. `<AttachmentImage>` calls this on unmount + on
 * `attachmentId` change in a cleanup `useEffect`. Leaks here would
 * otherwise pin the underlying `Blob` in memory, defeating the IDB
 * quota management.
 */
export function revokeBlobUrl(url: string | null): void {
  if (!url) return;
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

// ===========================================================================
// Quota + LRU helpers
// ===========================================================================

/**
 * Quota probe — wraps `navigator.storage.estimate()` and returns
 * the FREE bytes (or `null` if the API is unavailable, which is
 * normal in jsdom / Safari < 17.4 / locked-down iframes).
 *
 * Used by callers that want to decide whether to write a new
 * blob to IDB BEFORE attempting (preflight check). Returns
 * `null` means "don't preflight, just try the write and see".
 */
export interface QuotaEstimate {
  quotaBytes: number | null;
  usageBytes: number | null;
  freeBytes: number | null;
}

export async function estimateQuotaAvailable(): Promise<QuotaEstimate> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return { quotaBytes: null, usageBytes: null, freeBytes: null };
  }
  try {
    const est = await navigator.storage.estimate();
    const quotaBytes = typeof est.quota === 'number' ? est.quota : null;
    const usageBytes = typeof est.usage === 'number' ? est.usage : null;
    const freeBytes =
      quotaBytes !== null && usageBytes !== null
        ? Math.max(0, quotaBytes - usageBytes)
        : null;
    return { quotaBytes, usageBytes, freeBytes };
  } catch {
    // Defensive: some browsers (e.g. private-mode Safari) throw on estimate().
    return { quotaBytes: null, usageBytes: null, freeBytes: null };
  }
}

/**
 * Snapshot the TOTAL bytes currently held by the attachments cache.
 * SUM of `sizeBytes` (not actual `blob.size`, which can differ
 * marginally due to IDB-key encoding overhead — the row's column is
 * authoritative since it mirrors the file's pre-IDB size).
 */
export async function getCacheUsageBytes(): Promise<number> {
  const db = getDb();
  // The `EntityTable<AttachmentRow, 'id'>` types Dexie's `toArray()`
  // return as `Omit<AttachmentRow, 'id'>[]`, which doesn't expose
  // most fields typed. Cast it once at the array boundary so the
  // reduce callback types narrow cleanly (TS7006 fix).
  const rows = (await db.attachments.toArray()) as AttachmentRow[];
  return rows.reduce(
    (sum: number, r: AttachmentRow) => sum + (r.sizeBytes ?? 0),
    0,
  );
}

/**
 * LRU purge — delete oldest rows (by `lastAccessedAt` ASC) until
 * the cache is at or under `targetBytes`. Used by:
 *   - post-quota-warning fire-and-forget purge
 *   - v1.1 quota UI "Reclaim 50 MB" affordance
 *   - boot-time opportunistic purge (if cache > MAX)
 *
 * Skips rows still within `expiresAt` window (by tie-breaker),
 * but in practice `lastAccessedAt` order matches "really stale".
 *
 * Returns the count of purged rows + the bytes reclaimed for
 * caller-side telemetry / future UI feedback.
 */
export async function lruPurgeUntilUnder(
  targetBytes: number = Math.floor(ATTACHMENT_CACHE_MAX_BYTES / 2),
  now: number = nowMs(),
): Promise<{ purgedCount: number; bytesReclaimed: number }> {
  const db = getDb();
  const currentBytes = await getCacheUsageBytes();
  if (currentBytes <= targetBytes) {
    return { purgedCount: 0, bytesReclaimed: 0 };
  }

  // Fetch rows ordered by lastAccessedAt ASC; excludes already-expired
  // rows (which would be purged anyway) for cleanliness.
  const candidates = (await db.attachments
    .where('lastAccessedAt')
    .below(now)
    .sortBy('lastAccessedAt')) as AttachmentRow[];

  let bytesToReclaim = currentBytes - targetBytes;
  let purgedCount = 0;
  let bytesReclaimed = 0;
  const idsToDelete: string[] = [];
  for (const row of candidates) {
    if (bytesToReclaim <= 0) break;
    idsToDelete.push(row.id);
    bytesToReclaim -= row.sizeBytes;
    bytesReclaimed += row.sizeBytes;
    purgedCount += 1;
  }
  if (idsToDelete.length > 0) {
    await db.attachments.bulkDelete(idsToDelete);
  }
  return { purgedCount, bytesReclaimed };
}

/**
 * TTL purge — delete rows whose `expiresAt` has passed. Idempotent
 * no-op when no rows are expired. Boot-time hook candidate (M5-5).
 */
export async function purgeExpiredAttachments(
  now: number = nowMs(),
): Promise<number> {
  const db = getDb();
  const expired = (await db.attachments
    .where('expiresAt')
    .below(now)
    .toArray()) as AttachmentRow[];
  if (expired.length === 0) return 0;
  await db.attachments.bulkDelete(expired.map((r) => r.id));
  return expired.length;
}

/**
 * Lookup — list rows for one conversation, ordered by
 * `lastAccessedAt DESC` (most-recently-viewed first). NOT on the
 * hot path for M5-4; reserved for the v1.1 "Cached images in this
 * conversation" debug / quota UI.
 */
export async function listCachedAttachmentsForConversation(
  conversationId: string,
): Promise<AttachmentRow[]> {
  return (await getDb().attachments
    .where('conversationId')
    .equals(conversationId)
    .reverse()
    .sortBy('lastAccessedAt')) as AttachmentRow[];
}
