import { describe, it, expect } from 'vitest';
import {
  applyReactionAdd,
  applyReactionRemove,
} from '../../src/lib/api/chat';
import type {
  MessageListItem,
} from '../../src/lib/api/chat';

// ===========================================================================
// Tests — M4-7 cache-patch helpers (applyReactionAdd / applyReactionRemove)
// ===========================================================================
//
// These helpers are the SOURCE OF TRUTH for both the optimistic TanStack
// Query mutation patch (useAddReaction / useRemoveReaction) AND the
// Realtime postgres_changes projection (useConversationRealtime). They
// must:
//
//   1. Add a new bucket when none exists
//   2. Increment count on existing bucket (and OR hasMine)
//   3. Stable sort (count DESC, emoji ASC) after mutation
//   4. Decrement count on remove
//   5. REMOVE bucket entirely when count drops to 0
//   6. Idempotent against undefined / missing bucket (defensive)
//
// Without this layer of testing, regressions in the bucket shape + sort
// would silently corrupt the chip row UI AND foreign-Realtime projection
// simultaneously — both bugs being subtle (rows don't crash, just
// render in wrong order or wrong count).
// ===========================================================================

function makeReactions(
  spec: Array<{ emoji: '👍' | '❤️' | '😂' | '👀' | '🔥' | '🙏'; count: number; hasMine: boolean }>,
): MessageListItem['reactions'] {
  return spec;
}

describe('applyReactionAdd — bucket-create, increment, sort stability', () => {
  it('creates a new bucket when no bucket exists for the emoji', () => {
    const result = applyReactionAdd(makeReactions([]), '👍', true);
    expect(result).toEqual([{ emoji: '👍', count: 1, hasMine: true }]);
  });

  it('increments count and ORs hasMine on existing bucket', () => {
    const result = applyReactionAdd(
      makeReactions([{ emoji: '🔥', count: 2, hasMine: false }]),
      '🔥',
      true,
    );
    expect(result).toEqual([{ emoji: '🔥', count: 3, hasMine: true }]);
  });

  it('preserves hasMine=true when adding again (idempotent ADD)', () => {
    const result = applyReactionAdd(
      makeReactions([{ emoji: '❤️', count: 1, hasMine: true }]),
      '❤️',
      true,
    );
    // hasMine already true; OR is no-op. Count goes 1 → 2.
    expect(result).toEqual([{ emoji: '❤️', count: 2, hasMine: true }]);
  });

  it('does NOT mutate the input array (returns a new array)', () => {
    const input = makeReactions([{ emoji: '👍', count: 1, hasMine: false }]);
    const inputSnapshot = JSON.stringify(input);
    applyReactionAdd(input, '👍', true);
    expect(JSON.stringify(input)).toBe(inputSnapshot);
  });

  it('sorts by (count DESC, emoji ASC) after add', () => {
    const result = applyReactionAdd(
      makeReactions([
        { emoji: '👍', count: 2, hasMine: false },
        { emoji: '❤️', count: 5, hasMine: false },
      ]),
      '🔥',
      false,
    );
    // After add: ❤️=5, 👍=2, 🔥=1 → sorted: ❤️, 👍, 🔥
    expect(result.map((b) => b.emoji)).toEqual(['❤️', '👍', '🔥']);
    expect(result.map((b) => b.count)).toEqual([5, 2, 1]);
  });

  it('handles undefined input (returns array with single bucket)', () => {
    const result = applyReactionAdd(undefined, '👀', false);
    expect(result).toEqual([{ emoji: '👀', count: 1, hasMine: false }]);
  });
});

describe('applyReactionRemove — decrement, drop-at-zero, hasMine toggle', () => {
  it('decrements count + unsets hasMine on existing bucket', () => {
    const result = applyReactionRemove(
      makeReactions([{ emoji: '🔥', count: 3, hasMine: true }]),
      '🔥',
      true,
    );
    expect(result).toEqual([{ emoji: '🔥', count: 2, hasMine: false }]);
  });

  it('REMOVES the entire bucket when count drops to 0', () => {
    const result = applyReactionRemove(
      makeReactions([{ emoji: '👍', count: 1, hasMine: true }]),
      '👍',
      true,
    );
    expect(result).toEqual([]);
  });

  it('preserves hasMine when unsetHasMine=false (foreign user removing)', () => {
    // Foreign user has 2 ❤️, self does not; foreign removes their 2nd.
    const result = applyReactionRemove(
      makeReactions([{ emoji: '❤️', count: 2, hasMine: false }]),
      '❤️',
      false,
    );
    expect(result).toEqual([{ emoji: '❤️', count: 1, hasMine: false }]);
  });

  it('returns input untouched when bucket does not exist (defensive)', () => {
    const input = makeReactions([{ emoji: '👍', count: 2, hasMine: false }]);
    const result = applyReactionRemove(input, '❤️', false);
    expect(result).toEqual(input);
  });

  it('returns empty array when input is undefined', () => {
    expect(applyReactionRemove(undefined, '👍', true)).toEqual([]);
  });

  it('sorts by (count DESC, emoji ASC) after remove', () => {
    const result = applyReactionRemove(
      makeReactions([
        { emoji: '👍', count: 5, hasMine: false },
        { emoji: '❤️', count: 5, hasMine: true },
        { emoji: '🔥', count: 1, hasMine: false },
      ]),
      '❤️',
      true,
    );
    // After remove: ❤️=4, 👍=5, 🔥=1 → sorted: 👍(5), ❤️(4), 🔥(1)
    expect(result.map((b) => b.emoji)).toEqual(['👍', '❤️', '🔥']);
    expect(result.map((b) => b.count)).toEqual([5, 4, 1]);
    expect(result[1]?.hasMine).toBe(false);
  });

  it('does NOT mutate the input array (returns a new array)', () => {
    const input = makeReactions([{ emoji: '🔥', count: 2, hasMine: true }]);
    const inputSnapshot = JSON.stringify(input);
    applyReactionRemove(input, '🔥', true);
    expect(JSON.stringify(input)).toBe(inputSnapshot);
  });
});

describe('applyReactionAdd + applyReactionRemove — round-trip idempotence', () => {
  it('add → remove on the same emoji returns to the original empty array', () => {
    const step1 = applyReactionAdd(undefined, '🙏', true);
    expect(step1).toEqual([{ emoji: '🙏', count: 1, hasMine: true }]);
    const step2 = applyReactionRemove(step1, '🙏', true);
    expect(step2).toEqual([]);
  });

  it('add on existing → remove returns to single bucket with hasMine toggled off', () => {
    const start = makeReactions([{ emoji: '😂', count: 3, hasMine: false }]);
    const step1 = applyReactionAdd(start, '😂', true);
    expect(step1).toEqual([{ emoji: '😂', count: 4, hasMine: true }]);
    const step2 = applyReactionRemove(step1, '😂', true);
    expect(step2).toEqual([{ emoji: '😂', count: 3, hasMine: false }]);
  });
});
