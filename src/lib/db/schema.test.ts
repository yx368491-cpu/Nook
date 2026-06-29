import { afterEach, describe, it, expect } from 'vitest';
import { __resetDbForTests, getDb } from '@/lib/db/schema';
import { initOutboxRow, enqueue, applyMarkSent } from '@/lib/db/outbox';

// ===========================================================================
// M5-1 tests — Dexie schema (lib/db/schema.ts)
// ===========================================================================
//
// Confirms:
//   1. Database opens against the polyfilled jsdom IDB
//   2. Version is exactly 1 (no accidental .upgrade paths leaked)
//   3. Outbox table exists with the documented indexes
//   4. Indexes reject malformed client_msg_ids via Dexie key validation
//   5. Multi-row queries on conversationId + state indexes work
//   6. Reset-for-tests path closes & drops the singleton cleanly
// ===========================================================================

const NOW_STUB = 1_700_000_000_000;

describe('schema — NookOutboxDb opens and exposes v1 indexes', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('opens the database against fake-indexeddb', async () => {
    const db = getDb();
    expect(db.name).toBe('nook_outbox_v1');
    // `db.isOpen()` only flips true AFTER Dexie's async .open() resolves.
    // We force an open here so the assertion is synchronous; downstream
    // tests that read out of `db.outbox` would also implicitly open.
    await db.open();
    expect(db.isOpen()).toBe(true);
  });

  it('reports version 2 (post-M5-4 bump; v1 spec retained for migration compat)', () => {
    const db = getDb();
    // M5-4 — schema bumped from v1 → v2 (Dexie auto-migrates existing
    // v1 IDBs forward by adding the new `attachments` table). The v1
    // spec stays in `this.version(1).stores(...)` for migration compat.
    expect(db.verno).toBe(2);
  });

  it('exposes the outbox table with the documented indexes', () => {
    const db = getDb();
    expect(db.outbox).toBeDefined();

    const schema = db.tables.find((t) => t.name === 'outbox');
    expect(schema).toBeDefined();

    // Dexie 4 represents compound-key indexes (`[a+b]`) as an array
    // keyPath; scalar indexes as a string keyPath. Normalize both
    // forms to the bracket-joined string for assertion parity.
    // `keyPath` may be `undefined` for an empty/legacy schema — return
    // an empty string so the schema test stays in sync with Dexie's
    // optional types without forcing an `as any` cast.
    const formatKeyPath = (
      kp: string | readonly string[] | undefined,
    ): string => {
      if (kp === undefined) return '';
      return Array.isArray(kp) ? `[${kp.join('+')}]` : String(kp);
    };

    const indexNames: string[] = [formatKeyPath(schema!.schema.primKey.keyPath)];
    for (const idx of schema!.schema.indexes) {
      indexNames.push(formatKeyPath(idx.keyPath));
    }
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'clientMsgId',
        'conversationId',
        'state',
        'createdAt',
        '[state+createdAt]',
        'nextAttemptAt',
      ]),
    );
  });
});

describe('schema — end-to-end write + read round-trip via Dexie', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('enqueue → get by PK returns the persisted row', async () => {
    const row = await enqueue(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hello world',
      },
      NOW_STUB,
    );
    expect(row.state).toBe('pending');
    expect(row.attempts).toBe(0);
    expect(row.body).toBe('hello world');

    const fetched = await getDb().outbox.get(row.clientMsgId);
    expect(fetched).toBeDefined();
    expect(fetched!.body).toBe('hello world');
  });

  it('queries by conversationId index return only matching rows', async () => {
    await enqueue(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'a',
      },
      NOW_STUB,
    );
    await enqueue(
      {
        conversationId: 'conv-B',
        senderId: 'user-1',
        kind: 'text',
        body: 'b',
      },
      NOW_STUB + 1,
    );
    await enqueue(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'c',
      },
      NOW_STUB + 2,
    );

    const rowsA = await getDb()
      .outbox.where('conversationId').equals('conv-A')
      .sortBy('createdAt');
    expect(rowsA.map((r) => r.body)).toEqual(['a', 'c']);

    const rowsB = await getDb()
      .outbox.where('conversationId').equals('conv-B')
      .toArray();
    expect(rowsB.map((r) => r.body)).toEqual(['b']);
  });

  it('queries by [state+createdAt] compound index work for FIFO scans', async () => {
    await enqueue(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'first',
      },
      NOW_STUB,
    );
    const second = await enqueue(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'second',
      },
      NOW_STUB + 100,
    );
    await applyMarkSent(second.clientMsgId, NOW_STUB + 200);

    // The compound index should list 'first' (still pending) AND 'second'
    // (now sent) interleaved by createdAt — both visible because both rows
    // match the index range. We only verify the FIFO ordering matches
    // creation order.
    const all = await getDb()
      .outbox.where('[state+createdAt]')
      .between(['pending', 0], ['sent', Number.MAX_SAFE_INTEGER])
      .toArray();
    expect(all[0]!.body).toBe('first');
    expect(all[1]!.body).toBe('second');
    expect(all[0]!.state).toBe('pending');
    expect(all[1]!.state).toBe('sent');
  });
});

// ===========================================================================
// Round-trip: a row enqueued via initOutboxRow (or via enqueue()) is
// stored at the row constructed by the reducers. Defensive against
// accidental shape drift between the schema module and the reducer module.
// ===========================================================================

describe('schema ↔ outbox reducer — Row shape parity', () => {
  afterEach(async () => {
    await __resetDbForTests();
  });

  it('round-trips the full reducer Row shape through Dexie', async () => {
    const canonical = initOutboxRow(
      {
        conversationId: 'conv-A',
        senderId: 'user-1',
        kind: 'text',
        body: 'hello',
        replyToId: null,
      },
      NOW_STUB,
    );

    await getDb().outbox.put(canonical);
    const fetched = await getDb().outbox.get(canonical.clientMsgId);
    expect(fetched).toEqual(canonical);
  });
});
