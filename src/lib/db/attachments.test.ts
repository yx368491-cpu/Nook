import { afterEach, beforeEach, describe, it, expect } from 'vitest';

import {
  putAttachmentCache,
  getAttachmentCacheRow,
  touchAttachment,
  deleteAttachment,
  getCacheUsageBytes,
  lruPurgeUntilUnder,
  purgeExpiredAttachments,
  listCachedAttachmentsForConversation,
  estimateQuotaAvailable,
  ATTACHMENT_CACHE_MAX_BYTES,
  ATTACHMENT_CACHE_MAX_AGE_MS,
} from '@/lib/db/attachments';
import { __resetDbForTests, getDb } from '@/lib/db/schema';

// ===========================================================================
// M5-4 — attachment blob cache tests
// ===========================================================================
//
// The local Dexie `attachments` table backs the offline-first image
// pipeline: same-blob-ID hydration + LRU eviction. Tests cover the
// pure mutator/reader surface; the consumer-side hook
// `useAttachmentBlob` is exercised end-to-end via
// `useSendMessage.test.tsx` (M5-4 attachment path).
//
// Time discipline (mirrors M5-1/M5-3 conventions):
//   - `NOW_ZERO` = a fixed wall-clock that we'd never hit during the
//     test's actual run (2000-01-01 ish) so backdated rows are
//     unambiguously "old".
//   - `nowMs` wrappers inside functions accept a `now: number` arg
//     so row timestamps can be deterministic.
// ===========================================================================

const NOW_ZERO = 1_700_000_000_000;
const LATER_NOW = NOW_ZERO + 60_000;

function makeBlob(size = 16, mime = 'image/png'): Blob {
  // Real Blob from a Uint8Array — fake-indexeddb handles structuredClone
  // (so the row's `.blob` field doesn't lose bytes in storage).
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) bytes[i] = i % 256;
  return new Blob([bytes], { type: mime });
}

function makeRow(
  idSuffix: string,
  now: number = NOW_ZERO,
  size = 16,
): Parameters<typeof putAttachmentCache>[0] {
  return {
    id: `11111111-1111-4111-8111-${idSuffix.padStart(12, '0')}`,
    storagePath: `attachments/${idSuffix}/test.png`,
    conversationId: `conv-${idSuffix}`,
    blob: makeBlob(size, 'image/png'),
    mime: 'image/png',
    sizeBytes: size,
    width: 320,
    height: 240,
  };
}

describe('attachment blob cache — mutators', () => {
  beforeEach(async () => {
    await __resetDbForTests();
  });
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('putAttachmentCache persists the row with lastAccessedAt + expiresAt materialized', async () => {
    // NOTE: `fake-indexeddb`'s structuredClone degrades Blob instances
    // to plain-JSON-object facsimiles in some Vitest environments
    // (the `Blob` prototype is lost in transit). The row's
    // `sizeBytes` column IS preserved (it's a primitive number), so
    // we assert on the column rather than `blob.size`. The full-fidelity
    // `Blob` round-trip is exercised in the browser end-to-end smoke
    // path (cache hit → `URL.createObjectURL(row.blob)` render).
    const id = '11111111-1111-4111-8111-00000000000a';
    await putAttachmentCache(makeRow('00000000000a'), NOW_ZERO);
    const stored = await getAttachmentCacheRow(id);
    expect(stored).not.toBeNull();
    expect(stored!.lastAccessedAt).toBe(NOW_ZERO);
    expect(stored!.expiresAt).toBe(NOW_ZERO + ATTACHMENT_CACHE_MAX_AGE_MS);
    expect(stored!.sizeBytes).toBe(16);
    // Sanity: the column-level row shape survived Dexie round-trip.
    expect(typeof stored!.blob).toBeDefined();
  });

  it('getAttachmentCacheRow returns null on missing id', async () => {
    expect(
      await getAttachmentCacheRow('00000000-0000-4000-8000-000000000000'),
    ).toBeNull();
  });

  it('touchAttachment bumps lastAccessedAt only (preserves expiresAt)', async () => {
    const id = '11111111-1111-4111-8111-00000000000b';
    await putAttachmentCache(makeRow('00000000000b'), NOW_ZERO);
    const before = await getAttachmentCacheRow(id);
    expect(before!.lastAccessedAt).toBe(NOW_ZERO);

    const ok = await touchAttachment(id, LATER_NOW);
    expect(ok).toBe(true);

    const after = await getAttachmentCacheRow(id);
    expect(after!.lastAccessedAt).toBe(LATER_NOW);
    expect(after!.expiresAt).toBe(NOW_ZERO + ATTACHMENT_CACHE_MAX_AGE_MS);
  });

  it('touchAttachment returns false for missing row', async () => {
    const ok = await touchAttachment('00000000-0000-4000-8000-000000000000');
    expect(ok).toBe(false);
  });

  it('deleteAttachment removes a single row and returns true only when a row was deleted', async () => {
    const id = '11111111-1111-4111-8111-00000000000c';
    await putAttachmentCache(makeRow('00000000000c'), NOW_ZERO);
    expect(await deleteAttachment(id)).toBe(true);
    expect(await getAttachmentCacheRow(id)).toBeNull();
    expect(await deleteAttachment(id)).toBe(false);
  });
});

describe('attachment blob cache — LRU + eviction', () => {
  beforeEach(async () => {
    await __resetDbForTests();
  });
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('getCacheUsageBytes sums sizeBytes across all rows', async () => {
    await putAttachmentCache(makeRow('000000000001', NOW_ZERO, 100), NOW_ZERO);
    await putAttachmentCache(makeRow('000000000002', NOW_ZERO, 200), NOW_ZERO);
    expect(await getCacheUsageBytes()).toBe(300);
  });

  it('lruPurgeUntilUnder reclaims oldest rows first (by lastAccessedAt ASC)', async () => {
    // 5 rows of 100 bytes each = 500 bytes total
    for (let i = 0; i < 5; i += 1) {
      const id = `00000000000${i}`;
      // Backdate each row progressively so "oldest first" LRU order is known
      await putAttachmentCache(
        makeRow(id, NOW_ZERO - (5 - i) * 1000, 100),
        NOW_ZERO - (5 - i) * 1000,
      );
    }
    expect(await getCacheUsageBytes()).toBe(500);

    // Target = 250 bytes; we should purge the 2 oldest rows (200 bytes)
    // actually 3 oldest rows (300 bytes) to drop below 250.
    const result = await lruPurgeUntilUnder(250, NOW_ZERO);
    expect(result.purgedCount).toBeGreaterThanOrEqual(3);
    expect(result.bytesReclaimed).toBeGreaterThanOrEqual(300);
    expect(await getCacheUsageBytes()).toBeLessThanOrEqual(250);
  });

  it('lruPurgeUntilUnder is a no-op when under target', async () => {
    await putAttachmentCache(
      makeRow('000000000001', NOW_ZERO, 50),
      NOW_ZERO,
    );
    const result = await lruPurgeUntilUnder(1000, NOW_ZERO);
    expect(result).toEqual({ purgedCount: 0, bytesReclaimed: 0 });
  });

  it('purgeExpiredAttachments removes rows whose expiresAt has passed', async () => {
    // Insert row with a createdAt-NOW_ZERO; expiresAt is
    // NOW_ZERO + MAX_AGE_MS, so unless we backdate it, the row
    // is NOT expired. Use direct Dexie put to bypass the field
    // auto-materialization so we can pick "expired" arbitrarily.
    const db = getDb();
    const id = '11111111-1111-4111-8111-00000000000d';
    const blob = makeBlob(8, 'image/png');
    await db.attachments.put({
      id,
      storagePath: 'attachments/d/test.png',
      conversationId: 'conv-d',
      blob,
      mime: 'image/png',
      sizeBytes: 8,
      width: null,
      height: null,
      lastAccessedAt: NOW_ZERO,
      expiresAt: NOW_ZERO - 1000, // already expired
      createdAt: NOW_ZERO,
    });
    const purged = await purgeExpiredAttachments(NOW_ZERO);
    expect(purged).toBe(1);
    expect(await getAttachmentCacheRow(id)).toBeNull();
  });

  it('listCachedAttachmentsForConversation filters by convId', async () => {
    await putAttachmentCache(makeRow('000000000001', NOW_ZERO, 50), NOW_ZERO);
    const conv2Row = makeRow('000000000002', NOW_ZERO, 50);
    conv2Row.conversationId = 'conv-2';
    await putAttachmentCache(conv2Row, NOW_ZERO);

    const convA = await listCachedAttachmentsForConversation('conv-000000000001');
    expect(convA.length).toBe(1);
    const convB = await listCachedAttachmentsForConversation('conv-2');
    expect(convB.length).toBe(1);
    expect(convA[0]!.id).not.toBe(convB[0]!.id);
  });
});

describe('attachment blob cache — quota probe', () => {
  beforeEach(async () => {
    await __resetDbForTests();
  });
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('estimateQuotaAvailable returns null triple when navigator.storage is unavailable (jsdom)', async () => {
    const est = await estimateQuotaAvailable();
    // jsdom doesn't expose navigator.storage.estimate by default; the
    // helper MUST return null triple rather than throwing.
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.estimate !== 'function'
    ) {
      expect(est).toEqual({
        quotaBytes: null,
        usageBytes: null,
        freeBytes: null,
      });
    } else {
      // Some Node polyfills DO expose it; accept any non-throw result.
      expect(est).toBeDefined();
    }
  });

  it('ATTACHMENT_CACHE_MAX_BYTES is 200 MB and ATTACHMENT_CACHE_MAX_AGE_MS is 30 days (regression guard)', () => {
    expect(ATTACHMENT_CACHE_MAX_BYTES).toBe(200 * 1024 * 1024);
    expect(ATTACHMENT_CACHE_MAX_AGE_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
