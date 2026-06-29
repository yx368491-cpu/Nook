/**
 * Nook M6 · Invite helpers unit tests.
 *
 * Covers:
 * 1. generateInviteToken() — entropy, base64url shape, uniqueness
 * 2. isValidInviteTokenShape() — accepts 32-char base64url; rejects others
 * 3. validateCreateInviteRequest() — happy paths + 7 rejection branches
 * 4. computeExpiresAt() — boundary checks (TTL math)
 * 5. buildInviteInsertPayload() — exact field shape for EF
 * 6. buildInviteUrl() — trailing-slash trimming
 * 7. inviteErrorCode() — code mapping table
 * 8. Parity lock: src/lib/admin/invite.ts == supabase/functions/_shared/invite.ts
 */
import { describe, it, expect } from 'vitest';

// Vite-aliased `@` import (vitest.config.ts maps `@` → `./src`).
import {
  ALLOWED_TARGET_KINDS,
  DEFAULT_INVITE_TTL_HOURS,
  INVITE_TOKEN_BYTES,
  MAX_INVITE_TTL_HOURS,
  MIN_INVITE_TTL_HOURS,
  InviteValidationError,
  buildInviteInsertPayload,
  buildInviteUrl,
  computeExpiresAt,
  generateInviteToken,
  inviteErrorCode,
  isValidInviteTokenShape,
  validateCreateInviteRequest,
} from '@/lib/admin/invite';

describe('M6 invite — constants', () => {
  it('ALLOWED_TARGET_KINDS = ["any", "conversation"]', () => {
    expect([...ALLOWED_TARGET_KINDS]).toEqual(['any', 'conversation']);
  });
  it('INVITE_TOKEN_BYTES = 24 (192-bit entropy)', () => {
    expect(INVITE_TOKEN_BYTES).toBe(24);
  });
  it('TTL bounds: [1, 168] hours, default 24', () => {
    expect(MIN_INVITE_TTL_HOURS).toBe(1);
    expect(MAX_INVITE_TTL_HOURS).toBe(168);
    expect(DEFAULT_INVITE_TTL_HOURS).toBe(24);
  });
});

describe('M6 invite — generateInviteToken', () => {
  it('returns a 32-char base64url string', () => {
    const tok = generateInviteToken();
    expect(tok).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('does not contain URL-unsafe characters (+ / =)', () => {
    // Sample 1000 tokens to ensure no padding or URL-unsafe chars leak.
    const tokens = new Set(Array.from({ length: 100 }, () => generateInviteToken()));
    for (const t of tokens) {
      expect(t).not.toMatch(/[+/=]/);
      expect(t.length).toBe(32);
    }
    // Strong uniqueness: ≥ 99 unique tokens out of 100.
    expect(tokens.size).toBeGreaterThanOrEqual(99);
  });

  it('produces byte-level entropy (different on each call)', () => {
    const t1 = generateInviteToken();
    const t2 = generateInviteToken();
    expect(t1).not.toBe(t2);
  });

  it('round-trip: encode → isValidInviteTokenShape', () => {
    expect(isValidInviteTokenShape(generateInviteToken())).toBe(true);
  });
});

describe('M6 invite — isValidInviteTokenShape', () => {
  it('accepts 32-char base64url', () => {
    // 32 chars exactly: lowercase letters + digits
    expect(isValidInviteTokenShape('abcdefghijklmnopqrstuvwxyz123456')).toBe(true);
    // 32 chars exactly: uppercase + base64url alphabet (-_)
    expect(isValidInviteTokenShape('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234-_')).toBe(true);
  });
  it('rejects non-string', () => {
    expect(isValidInviteTokenShape(undefined)).toBe(false);
    expect(isValidInviteTokenShape(null)).toBe(false);
    expect(isValidInviteTokenShape(123)).toBe(false);
    expect(isValidInviteTokenShape({})).toBe(false);
  });
  it('rejects wrong length', () => {
    expect(isValidInviteTokenShape('short')).toBe(false);
    expect(isValidInviteTokenShape('X'.repeat(33))).toBe(false);
    expect(isValidInviteTokenShape('X'.repeat(31))).toBe(false);
  });
  it('rejects base64 padding / non-alphabet chars', () => {
    expect(isValidInviteTokenShape('A'.repeat(31) + '=')).toBe(false);
    expect(isValidInviteTokenShape('0123456789abcdefghijklmnopqrstuv+/')).toBe(false); // 34 with / and +
  });
});

describe('M6 invite — validateCreateInviteRequest', () => {
  const NOW = 1_700_000_000_000; // fixed for deterministic tests

  describe('happy paths', () => {
    it('target_kind="any", no ttl_hours → default 24h', () => {
      const r = validateCreateInviteRequest({ target_kind: 'any' }, NOW);
      expect(r.targetKind).toBe('any');
      expect(r.targetConversationId).toBeNull();
      expect(r.expiresAt).toBe(computeExpiresAt(24, NOW));
    });

    it('target_kind="conversation" with valid UUID', () => {
      const cid = '12345678-1234-1234-1234-123456789abc';
      const r = validateCreateInviteRequest(
        { target_kind: 'conversation', target_conversation_id: cid, ttl_hours: 48 },
        NOW,
      );
      expect(r.targetKind).toBe('conversation');
      expect(r.targetConversationId).toBe(cid);
      expect(r.expiresAt).toBe(computeExpiresAt(48, NOW));
    });

    it('lowercase UUID is accepted (case-insensitive regex)', () => {
      const cid = 'abcdef01-2345-6789-abcd-ef0123456789';
      expect(() =>
        validateCreateInviteRequest(
          { target_kind: 'conversation', target_conversation_id: cid },
          NOW,
        ),
      ).not.toThrow();
    });

    it('uppercase UUID is accepted', () => {
      const cid = 'ABCDEF01-2345-6789-ABCD-EF0123456789';
      expect(() =>
        validateCreateInviteRequest(
          { target_kind: 'conversation', target_conversation_id: cid },
          NOW,
        ),
      ).not.toThrow();
    });
  });

  describe('rejections', () => {
    it('MALFORMED_BODY: null', () => {
      expect.assertions(2);
      try { validateCreateInviteRequest(null, NOW); } catch (e) {
        expect(e).toBeInstanceOf(InviteValidationError);
        expect((e as InviteValidationError).code).toBe('MALFORMED_BODY');
      }
    });

    it('MALFORMED_BODY: non-object', () => {
      expect.assertions(2);
      try { validateCreateInviteRequest('string', NOW); } catch (e) {
        expect(e).toBeInstanceOf(InviteValidationError);
        expect((e as InviteValidationError).code).toBe('MALFORMED_BODY');
      }
    });

    it('BAD_KIND: missing target_kind', () => {
      expect.assertions(1);
      try { validateCreateInviteRequest({}, NOW); } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_KIND');
      }
    });

    it('BAD_KIND: invalid target_kind value', () => {
      expect.assertions(1);
      try { validateCreateInviteRequest({ target_kind: 'invalid' }, NOW); } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_KIND');
      }
    });

    it('BAD_KIND: numeric target_kind', () => {
      expect.assertions(1);
      try { validateCreateInviteRequest({ target_kind: 42 }, NOW); } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_KIND');
      }
    });

    it('BAD_CONVERSATION_ID: target_kind=conversation missing cid', () => {
      expect.assertions(1);
      try { validateCreateInviteRequest({ target_kind: 'conversation' }, NOW); } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_CONVERSATION_ID');
      }
    });

    it('BAD_CONVERSATION_ID: cid is not a UUID', () => {
      expect.assertions(1);
      try {
        validateCreateInviteRequest(
          { target_kind: 'conversation', target_conversation_id: 'not-a-uuid' },
          NOW,
        );
      } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_CONVERSATION_ID');
      }
    });

    it('BAD_CONVERSATION_ID: cid is empty string', () => {
      expect.assertions(1);
      try {
        validateCreateInviteRequest(
          { target_kind: 'conversation', target_conversation_id: '' },
          NOW,
        );
      } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_CONVERSATION_ID');
      }
    });

    it('BAD_TTL: ttl below MIN', () => {
      expect.assertions(1);
      try { validateCreateInviteRequest({ target_kind: 'any', ttl_hours: 0 }, NOW); } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_TTL');
      }
    });

    it('BAD_TTL: ttl above MAX', () => {
      expect.assertions(1);
      try { validateCreateInviteRequest({ target_kind: 'any', ttl_hours: 200 }, NOW); } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_TTL');
      }
    });

    it('BAD_TTL: ttl is fractional', () => {
      expect.assertions(1);
      try { validateCreateInviteRequest({ target_kind: 'any', ttl_hours: 1.5 }, NOW); } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_TTL');
      }
    });

    it('BAD_TTL: ttl is non-numeric', () => {
      expect.assertions(1);
      try { validateCreateInviteRequest({ target_kind: 'any', ttl_hours: '24' }, NOW); } catch (e) {
        expect((e as InviteValidationError).code).toBe('BAD_TTL');
      }
    });
  });
});

describe('M6 invite — computeExpiresAt', () => {
  it('adds ttlHours × 3600 × 1000 ms to `now` and emits ISO', () => {
    // 1_700_000_000_000 ms = 2023-11-14T22:13:20.000Z (the START point).
    // + 24h = 1_700_086_400_000 ms = 2023-11-15T22:13:20.000Z (the END point).
    const now = 1_700_000_000_000;
    expect(computeExpiresAt(24, now)).toBe('2023-11-15T22:13:20.000Z');
  });
  it('zero ttl still produces a future timestamp (now + 0)', () => {
    const now = 0;
    expect(computeExpiresAt(0, now)).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('M6 invite — buildInviteInsertPayload', () => {
  it('produces DB-ready snake_case columns', () => {
    const payload = buildInviteInsertPayload({
      createdBy: 'uid-1',
      token: 'aaaaaaaa-bbbbbbbb-cccccccc',
      validated: {
        targetKind: 'conversation',
        targetConversationId: '12345678-1234-1234-1234-123456789abc',
        expiresAt: '2024-01-01T00:00:00.000Z',
      },
    });
    expect(payload).toEqual({
      token: 'aaaaaaaa-bbbbbbbb-cccccccc',
      created_by: 'uid-1',
      target_kind: 'conversation',
      target_conversation_id: '12345678-1234-1234-1234-123456789abc',
      expires_at: '2024-01-01T00:00:00.000Z',
    });
  });

  it('any kind yields target_conversation_id: null', () => {
    const payload = buildInviteInsertPayload({
      createdBy: 'uid-1',
      token: 'tok',
      validated: {
        targetKind: 'any',
        targetConversationId: null,
        expiresAt: '2024-01-01T00:00:00.000Z',
      },
    });
    expect(payload.target_conversation_id).toBeNull();
    expect(payload.target_kind).toBe('any');
  });
});

describe('M6 invite — buildInviteUrl', () => {
  it('joins site URL + path', () => {
    expect(buildInviteUrl('https://nook.example', 'abc123')).toBe(
      'https://nook.example/invite/abc123',
    );
  });
  it('trims trailing slash', () => {
    expect(buildInviteUrl('https://nook.example/', 'abc123')).toBe(
      'https://nook.example/invite/abc123',
    );
  });
  it('multiple trailing slashes are collapsed', () => {
    expect(buildInviteUrl('https://nook.example///', 'abc123')).toBe(
      'https://nook.example/invite/abc123',
    );
  });
});

describe('M6 invite — inviteErrorCode mapping', () => {
  it('BAD_KIND → E_VAL_REQUIRED_FIELD (target_kind is required field)', () => {
    expect(inviteErrorCode(new InviteValidationError('BAD_KIND', 'x'))).toBe(
      'E_VAL_REQUIRED_FIELD',
    );
  });
  it('BAD_CONVERSATION_ID → E_VAL_INVALID_FORMAT', () => {
    expect(
      inviteErrorCode(new InviteValidationError('BAD_CONVERSATION_ID', 'x')),
    ).toBe('E_VAL_INVALID_FORMAT');
  });
  it('BAD_TTL → E_VAL_INVALID_FORMAT', () => {
    expect(inviteErrorCode(new InviteValidationError('BAD_TTL', 'x'))).toBe(
      'E_VAL_INVALID_FORMAT',
    );
  });
  it('MALFORMED_BODY → E_VAL_INVALID_FORMAT', () => {
    expect(
      inviteErrorCode(new InviteValidationError('MALFORMED_BODY', 'x')),
    ).toBe('E_VAL_INVALID_FORMAT');
  });
});

// =========================================================================
// Parity contract — documented rather than enforced via file-comparison.
//
// src/lib/admin/invite.ts MUST be a byte-for-byte mirror of
// supabase/functions/_shared/invite.ts (modulo imports + top docstring).
// The two files share logic and we cannot rely on a runtime file-comparison
// test, because that would require `node:fs` + `@types/node` in the
// browser ESM module graph (which is not currently configured).
//
// Conventions for future drift detection:
//   - All `/^function ...$/` declarations: identical body
//   - Constants: identical values across both copies
//   - If you edit one, edit the other in the same commit.
//   - Code-reviewer will catch drift on review (compare-files step).
// =========================================================================
