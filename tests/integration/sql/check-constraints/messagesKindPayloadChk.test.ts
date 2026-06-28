import { describe, it, expect } from 'vitest';
import {
  evaluateMessagesKindPayloadChk,
  RECALLED_BODY_SENTINEL,
  type MessageInvariantRow,
} from './messagesKindPayloadChk';

// ===========================================================================
// Fixtures
// ===========================================================================

const ISO = '2026-06-28T12:34:56.000Z';

/** Build a row with explicit overrides on top of safe defaults. */
function row(over: Partial<MessageInvariantRow>): MessageInvariantRow {
  return {
    kind: 'text',
    body: null,
    attachment_id: null,
    recalled_at: null,
    ...over,
  };
}

// ===========================================================================
// 6 (kind × state) combinations + defense-in-depth + invariants
// ===========================================================================

describe('messages_kind_payload_chk (mirror of migration 0011)', () => {
  // -------------------------------------------------------------------------
  // PASS — the 6 (kind × state) combinations prescribed by the SQL CHECK.
  // The 7th case is the symmetric image-recall / file-recall variant of #6.
  // -------------------------------------------------------------------------
  describe('PASS · 6 (kind × state) combinations', () => {
    it('1. text normal → branch A (body required, attachment_id null)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'text', body: 'Hello, world!' }),
      );
      expect(result.passes).toBe(true);
      expect(result.branch).toBe('A');
      expect(result.reason).toMatch(/normal text/);
    });

    it('2. text recalled → branch D (sentinel body + recalled_at set)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({
          kind: 'text',
          body: RECALLED_BODY_SENTINEL,
          recalled_at: ISO,
        }),
      );
      expect(result.passes).toBe(true);
      expect(result.branch).toBe('D');
      expect(result.reason).toMatch(/soft-recalled/);
    });

    it('3. system normal → branch B (immutable: body null, attachment_id null)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'system' }),
      );
      expect(result.passes).toBe(true);
      expect(result.branch).toBe('B');
      expect(result.reason).toMatch(/system \(always/);
    });

    it('4. image normal → branch C (body null, attachment_id required)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'image', attachment_id: 'att-image-1' }),
      );
      expect(result.passes).toBe(true);
      expect(result.branch).toBe('C');
      expect(result.reason).toMatch(/normal image\/file/);
    });

    it('5. file normal → branch C (body null, attachment_id required)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'file', attachment_id: 'att-file-1' }),
      );
      expect(result.passes).toBe(true);
      expect(result.branch).toBe('C');
      expect(result.reason).toMatch(/normal image\/file/);
    });

    it('6. image recalled → branch D (sentinel body, recalled_at set, attachment_id preserved)', () => {
      // attachment_id is INTACT on image recall per migration 0010 comment
      // (the 30-day J-01 hard-delete + J-03 storage cleanup eventually
      // settle the storage object). Recalled rows simply have the sentinel
      // body — branch D does not constrain attachment_id.
      const result = evaluateMessagesKindPayloadChk(
        row({
          kind: 'image',
          body: RECALLED_BODY_SENTINEL,
          attachment_id: 'att-image-1',
          recalled_at: ISO,
        }),
      );
      expect(result.passes).toBe(true);
      expect(result.branch).toBe('D');
      expect(result.reason).toMatch(/soft-recalled/);
    });

    it('7. file recalled → branch D (same as image)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({
          kind: 'file',
          body: RECALLED_BODY_SENTINEL,
          attachment_id: 'att-file-1',
          recalled_at: ISO,
        }),
      );
      expect(result.passes).toBe(true);
      expect(result.branch).toBe('D');
      expect(result.reason).toMatch(/soft-recalled/);
    });

    it('8. text + empty body string → branch A (SQL `IS NOT NULL` accepts "" — body-length is a SEPARATE CHECK)', () => {
      // Defense-of-the-mirror: this guard test catches future drift if
      // someone adds `length > 0` back into branch A. The SQL CHECK only
      // requires `body IS NOT NULL`; the body-length constraint is
      // enforced by a DIFFERENT CHECK and is NOT mirrored here.
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'text', body: '' }),
      );
      expect(result.passes).toBe(true);
      expect(result.branch).toBe('A');
    });
  });

  // -------------------------------------------------------------------------
  // REJECT — defense-in-depth flag + invariants. The headline case here is
  // A0: a service_role bypass trying to recall a system row hits a CHECK
  // violation rather than silently passing via branch D.
  // -------------------------------------------------------------------------
  describe('REJECT · invariants + the headline defense-in-depth case', () => {
    it('A0. system-recall-attempt REJECTED (branch D excludes kind <> system)', () => {
      // This is the case the M4-4 review specifically called out: without
      // branch D's `kind <> 'system'` exclusion, a service_role bypass
      // could create `(system, '__recalled__', recalled_at)` rows via
      // direct SQL UPDATE — silently passing the CHECK. With the exclusion,
      // the row is REJECTED and the invariant is enforced at the DB layer.
      const result = evaluateMessagesKindPayloadChk(
        row({
          kind: 'system',
          body: RECALLED_BODY_SENTINEL,
          recalled_at: ISO,
        }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
      expect(result.reason).toMatch(/system-recall BLOCKED/);
    });

    it('A1. text + body null → REJECT (text MUST have body)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'text', body: null }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
      expect(result.reason).toMatch(/text requires body/);
    });

    it('A2. text + attachment_id not null → REJECT (text MUST NOT have attachment_id)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'text', body: 'Hello', attachment_id: 'att-wrong' }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
    });

    it('A3. text + recalled_at set but body ≠ sentinel → REJECT', () => {
      // fn_send_text_message should not generate this shape; the test
      // asserts the CHECK still catches it if a future change makes it
      // possible.
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'text', body: 'Original text', recalled_at: ISO }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
      expect(result.reason).toMatch(/body = '__recalled__'/);
    });

    it('A4. image + body not null + recalled_at null → REJECT', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'image', body: 'Wrong', attachment_id: 'att-image-1' }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
      expect(result.reason).toMatch(/normal image\/file requires body null/);
    });

    it('A5. image + attachment_id null → REJECT (image MUST have attachment_id)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'image', body: null, attachment_id: null }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
      expect(result.reason).toMatch(/requires attachment_id non-null/);
    });

    it('A6. image + body not null + recalled_at set (body ≠ sentinel) → REJECT', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({
          kind: 'image',
          body: 'Not a sentinel',
          attachment_id: 'att-image-1',
          recalled_at: ISO,
        }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
      expect(result.reason).toMatch(/body = '__recalled__'/);
    });

    it('A7. file + body not null (non-recalled) → REJECT', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'file', body: 'Wrong', attachment_id: 'att-file-1' }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
    });

    it('A8. system + body not null → REJECT (system body MUST be null)', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'system', body: 'Wrong' }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
      expect(result.reason).toMatch(/system requires body null/);
    });

    it('A9. system + attachment_id not null → REJECT', () => {
      const result = evaluateMessagesKindPayloadChk(
        row({ kind: 'system', attachment_id: 'att-wrong' }),
      );
      expect(result.passes).toBe(false);
      expect(result.branch).toBe(null);
      expect(result.reason).toMatch(/system requires attachment_id null/);
    });
  });

  // -------------------------------------------------------------------------
  // Semantic invariants — a programmatic sweep across the (kind × state)
  // matrix to confirm every PASS result maps to EXACTLY ONE branch and every
  // REJECT maps to NO branch.
  // -------------------------------------------------------------------------
  describe('Semantic invariants — branch once-only', () => {
    it('every PASS result maps to EXACTLY ONE branch (A, B, C, or D)', () => {
      const passCases: MessageInvariantRow[] = [
        row({ kind: 'text', body: 'Hi' }),
        row({ kind: 'text', body: 'Multi\nline' }),
        row({ kind: 'text', body: RECALLED_BODY_SENTINEL, recalled_at: ISO }),
        row({ kind: 'system' }),
        row({ kind: 'image', attachment_id: 'a' }),
        row({ kind: 'file', attachment_id: 'b' }),
        row({
          kind: 'image',
          body: RECALLED_BODY_SENTINEL,
          attachment_id: 'a',
          recalled_at: ISO,
        }),
        row({
          kind: 'file',
          body: RECALLED_BODY_SENTINEL,
          attachment_id: 'b',
          recalled_at: ISO,
        }),
      ];
      for (const c of passCases) {
        const result = evaluateMessagesKindPayloadChk(c);
        expect(result.passes).toBe(true);
        expect(['A', 'B', 'C', 'D']).toContain(result.branch);
      }
    });

    it('every REJECT result maps to NO branch (always null)', () => {
      const failCases: MessageInvariantRow[] = [
        // text shape violations
        row({ kind: 'text', body: null }),
        row({ kind: 'text', body: 'X', attachment_id: 'att-wrong' }),
        row({ kind: 'text', body: 'Original', recalled_at: ISO }),
        // image / file shape violations
        row({ kind: 'image', body: 'Wrong', attachment_id: 'a' }),
        row({ kind: 'image', body: null, attachment_id: null }),
        row({
          kind: 'file',
          body: 'Not sentinel',
          attachment_id: 'b',
          recalled_at: ISO,
        }),
        // system shape violations (incl. the headline system-recall case)
        row({ kind: 'system', body: 'Wrong' }),
        row({ kind: 'system', attachment_id: 'att-wrong' }),
        row({
          kind: 'system',
          body: RECALLED_BODY_SENTINEL,
          recalled_at: ISO,
        }),
      ];
      for (const c of failCases) {
        const result = evaluateMessagesKindPayloadChk(c);
        expect(result.passes).toBe(false);
        expect(result.branch).toBe(null);
      }
    });
  });
});
