import { afterEach, beforeEach, describe, it, expect } from 'vitest';

import { getDb, __resetDbForTests } from '@/lib/db/schema';

// ===========================================================================
// M5-4 — Dexie schema v2 migration test
// ===========================================================================
//
// Round-3 → round-4 fix: `Table.index(name)` is NOT exposed on
// `EntityTable<T, 'id'>` (the typed-table alias Dexie 4 returns when
// you declare an EntityTable<T, KeyPath>). Switched to `db.tables.find()`
// introspection (matches the M5-1 schema.test.ts pattern) which reads
// `schema.indexes` (a stable public-API array of `IndexSpec` records,
// each with a `keyPath`). If the named index wasn't declared in the
// schema stores() string, it just isn't in the array — purely a
// structural assertion with NO Dexie-runtime side effects to trip on.
//
// Also added: the [conversationId+lastAccessedAt] compound index
// check via the same `.keyPath.includes('conversationId') &&
// .keyPath.includes('lastAccessedAt')` boolean.
// ===========================================================================

const formatKeyPath = (
  kp: string | readonly string[] | undefined,
): string => {
  if (kp === undefined) return '';
  return Array.isArray(kp) ? `[${kp.join('+')}]` : String(kp);
};

const getAttachmentsTable = () => {
  const db = getDb();
  // Force the Dexie open + schema apply by issuing a no-op read on
  // both tables. (Before this, the connection is lazy and table
  // names may not have been resolved yet.)
  void db.outbox.count();
  void db.attachments.count();
  return db.tables.find((t) => t.name === 'attachments')!;
};

const attachmentsIndexNames = (): string[] => {
  const schema = getAttachmentsTable();
  return schema.schema.indexes.map((idx) => formatKeyPath(idx.keyPath));
};

describe('Dexie schema v2 migration — `nook_outbox_v1` database', () => {
  beforeEach(async () => {
    await __resetDbForTests();
  });
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('opens the v2 schema and exposes BOTH `outbox` and `attachments` tables', () => {
    const db = getDb();
    const tables = db.tables.map((t) => t.name);
    expect(tables).toContain('outbox');
    expect(tables).toContain('attachments');
  });

  it('`attachments` table declares the `lastAccessedAt` index (drives the LRU scan)', () => {
    expect(attachmentsIndexNames()).toContain('lastAccessedAt');
  });

  it('`attachments` table declares the `expiresAt` index (drives TTL purge)', () => {
    expect(attachmentsIndexNames()).toContain('expiresAt');
  });

  it('`attachments` table declares the `conversationId` index', () => {
    expect(attachmentsIndexNames()).toContain('conversationId');
  });

  it('`attachments` table declares the `[conversationId+lastAccessedAt]` compound index (drives per-conv LRU)', () => {
    expect(attachmentsIndexNames()).toContain('[conversationId+lastAccessedAt]');
  });
});
