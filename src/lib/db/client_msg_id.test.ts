import { describe, it, expect } from 'vitest';
import {
  generateClientMsgId,
  isValidClientMsgId,
} from '@/lib/db/client_msg_id';

// ===========================================================================
// M5-1 tests — client_msg_id UUID v4 helper
// ===========================================================================
//
// Covers the SoT (single source of truth) that ships M5-1's API
// surface. Future callers (outbox schema PK, SW replay dedupe) need
// this helper to NEVER produce a malformed ID — silent corruption
// would surface as both server-side PG unique-index 23505 errors
// and "ghost" outbox rows that never complete their state machine.
//
// What we test:
//   1. generate() returns a valid UUID v4 every time
//   2. pattern validator accepts the canonical 36-char hyphenated
//      UUID v4 shape and rejects empty / non-string / case-shifted
//      variant nibbles
//   3. 50 successive generates -> 50 distinct values (in-flight
//      dedupe property; cosmologically rare collision at 2^-122 per
//      pair but pattern sanity is what we verify)
// ===========================================================================

describe('generateClientMsgId — UUID v4 mint', () => {
  it('returns a 36-character hyphenated string', () => {
    const id = generateClientMsgId();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(36);
    expect(id.split('-')).toHaveLength(5);
  });

  it('returns a string that the validator accepts', () => {
    const id = generateClientMsgId();
    expect(isValidClientMsgId(id)).toBe(true);
  });

  it('produces 50 distinct IDs across consecutive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      ids.add(generateClientMsgId());
    }
    expect(ids.size).toBe(50);
  });

  it('emits the canonical version-4 hex pattern (4xxx, 89ab Y)', () => {
    for (let i = 0; i < 10; i += 1) {
      const id = generateClientMsgId();
      // 14th nibble (index 14) is the version — MUST be '4'
      expect(id.charAt(14)).toBe('4');
      // 19th nibble (index 19) is the variant nibble — MUST be 8|9|a|b
      expect(/[89ab]/i.test(id.charAt(19))).toBe(true);
    }
  });
});

describe('isValidClientMsgId — UUID v4 validator', () => {
  // Canonical UUID v4 from the RFC 4122 § 4.4 example
  const VALID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

  it('accepts the canonical RFC 4122 example', () => {
    expect(isValidClientMsgId(VALID)).toBe(true);
  });

  it('accepts a freshly-generated ID', () => {
    expect(isValidClientMsgId(generateClientMsgId())).toBe(true);
  });

  it('accepts uppercase hex (case-insensitive flag)', () => {
    expect(isValidClientMsgId(VALID.toUpperCase())).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidClientMsgId('')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidClientMsgId(null)).toBe(false);
    expect(isValidClientMsgId(undefined)).toBe(false);
    expect(isValidClientMsgId(123)).toBe(false);
    expect(isValidClientMsgId({})).toBe(false);
    expect(isValidClientMsgId([])).toBe(false);
    expect(isValidClientMsgId(true)).toBe(false);
  });

  it('rejects wrong-length strings', () => {
    expect(isValidClientMsgId('7c9e6679')).toBe(false); // 8 chars, no dashes
    expect(isValidClientMsgId('7c9e6679-7425-40de-944b-e07fc1f90ae7-extra')).toBe(false);
  });

  it('rejects a v1 / v3 / v5 UUID (wrong version nibble)', () => {
    // Version 1 UUID ("1" at position 14) — NOT a v4
    expect(isValidClientMsgId('7c9e6679-7425-10de-944b-e07fc1f90ae7')).toBe(false);
    // Version 5 UUID ("5" at position 14) — NOT a v4
    expect(isValidClientMsgId('7c9e6679-7425-50de-944b-e07fc1f90ae7')).toBe(false);
  });

  it('rejects UUIDs whose variant nibble is wrong', () => {
    // '7c9e6679-7425-4000-c...' — variant nibble 'c' is variant 7 (Microsoft
    // GUID), NOT in the standard RFC 4122 v4 range [8, 9, a, b]
    expect(isValidClientMsgId('7c9e6679-7425-40de-c44b-e07fc1f90ae7')).toBe(false);
  });

  it('rejects malformed UUIDs with bad chars', () => {
    // 'G' is not hex
    expect(isValidClientMsgId('Gc9e6679-7425-40de-944b-e07fc1f90ae7')).toBe(false);
  });
});
