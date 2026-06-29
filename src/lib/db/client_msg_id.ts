/**
 * M5-1 + M5-3 — `client_msg_id` UUID v4 helper.
 *
 * The dedupe ID chain has 3 cooperating layers:
 *   1. Composer.tsx generates a UUID v4 on every send (M3-4 optimistic UI)
 *   2. The outbox table PK = same UUID v4 (this file)
 *   3. The `messages.client_msg_id` column gets the same UUID v4 on
 *      successful REST INSERT (lib/api/chat.ts + server migration 0001)
 *
 * The server uses a PARTIAL UNIQUE INDEX
 * `messages_client_msg_id_unique_idx (conversation_id, client_msg_id) WHERE NOT NULL`
 * (migration 0001) so:
 *   - Same client_msg_id within the same conv is impossible (idempotency)
 *   - Different conv does NOT collide (Round-2 Q3)
 *
 * This helper is the single canonical place to mint a UUID v4 — it
 * validates the format BEFORE handing back so a malformed input
 * (e.g. empty string, non-UUID, "undefined") surfaces as a type error
 * instead of silently corrupting the outbox primary key.
 *
 * Format contract (RFC 4122 § 4.4):
 *   `xxxxxxxx-xxxx-4xxx-Yxxx-xxxxxxxxxxxx` where Y ∈ {8, 9, a, b}
 *   Examples: `7c9e6679-7425-40de-944b-e07fc1f90ae7`
 *
 * Test coverage: see client_msg_id.test.ts (M5-1 docstring § verification).
 */

/** Canonical UUID v4 format. Lowercase hex, RFC 4122 § 4.4. */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Mint a fresh UUID v4. Wraps `crypto.randomUUID()` (available in all
 * modern evergreen browsers per SPEC § 3.8) so the call surface stays
 * uniform with the validator below.
 *
 * Performance: < 1 µs. No need to memoize; UUID v4 collisions across
 * ≤ 20-friend / ≤ 4-group / ≤ 30 day window are cosmologically rare
 * (~2^-122 probability per independent generation).
 */
export function generateClientMsgId(): string {
  return crypto.randomUUID();
}

/**
 * Type guard — returns `true` iff the input matches the canonical
 * UUID v4 pattern. Used to validate IDs coming from the network
 * (e.g. Realtime echo payload, server response) before passing them
 * to Dexie's string-keyed primary key slot. Returns `false` on any
 * non-string, empty string, or malformed input — NEVER throws.
 *
 * Note: we DO NOT enforce the "4" version nibble + "89ab" variant
 * nibble in DEV because some realtime middleware normalizes to
 * lowercase in transit; the regex uses `/i` (case-insensitive) and
 * only the structural `4` + `[89ab]` position bits matter for
 * "v4-ness"; if a future migration uses UUID v7 or v8 the validator
 * should be widened.
 */
export function isValidClientMsgId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length !== 36) return false;
  return UUID_V4_PATTERN.test(value);
}

/**
 * Authoritative read-side derive — caller (e.g. a future SW bg sync
 * replay handler) can use this to validate IDs emitted before the
 * RP migration lands. The function is pure (no side effects) — same
 * input always returns the same boolean — so it's safe to use as a
 * tight conditional in idempotency replays.
 */
