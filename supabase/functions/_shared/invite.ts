/**
 * Nook M6 · Edge Function shared invite helpers.
 *
 * PURE helpers — no Deno `serve`, no Supabase client, no fetch calls.
 * Used by `supabase/functions/admin-create-invite/index.ts`.
 *
 * Mirrored (verbatim impl) at `src/lib/admin/invite.ts` so vitest can
 * unit-test the helpers without Deno runtime. If you edit EITHER copy,
 * edit both — and update the parity assertions in `invite.test.ts`.
 *
 * SPEC:
 * - F-SEC-04 / CAP-03 — Owner-only invite issuance (gate at EF, not here)
 * - F-AUTH-03  — invite token is non-guessable CSPRNG (192-bit entropy)
 * - F-AUTH-04  — invite has hard TTL bound (1..168 hours)
 * - F-AUTH-07  — target_kind ∈ {'any', 'conversation'} with optional FK
 * - DATA-MODEL R-2  — invites.token is TEXT UNIQUE, base64url-compatible
 */

// ========================================================================
// Constants
// ========================================================================

/** Allowed target kinds per DATA-MODEL `invites.target_kind` CHECK. */
export const ALLOWED_TARGET_KINDS = ['any', 'conversation'] as const;
export type InviteTargetKind = (typeof ALLOWED_TARGET_KINDS)[number];

/** Default TTL per SPEC F-AUTH-04 (24 hours). */
export const DEFAULT_INVITE_TTL_HOURS = 24;

/** Minimum TTL: 1 hour. */
export const MIN_INVITE_TTL_HOURS = 1;

/** Maximum TTL: 168 hours (7 days) — beyond this is overgenerous for v1.0. */
export const MAX_INVITE_TTL_HOURS = 168;

/** Token entropy in bytes. 24 bytes × 8 = 192 bits; 24 bytes base64url ≈ 32 chars. */
export const INVITE_TOKEN_BYTES = 24;

/**
 * Request validation error codes. Friendly for both Postgrest-style `'E_*'`
 * strings and human-readable UI display.
 */
export type InviteValidationCode =
  | 'BAD_KIND'
  | 'BAD_TTL'
  | 'BAD_CONVERSATION_ID'
  | 'BAD_USER_ID'
  | 'BAD_TOKEN'
  | 'MALFORMED_BODY';

export class InviteValidationError extends Error {
  readonly code: InviteValidationCode;
  constructor(code: InviteValidationCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'InviteValidationError';
  }
}

// ========================================================================
// Token generation
// ========================================================================

/**
 * Base64url-encode an arbitrary byte array (RFC 4648 §5).
 * Pure — Deno's atob-equivalent via `String.fromCharCode` bytewise.
 * No padding (`=` stripped) — shorter URLs.
 */
function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  // `btoa` is available in Deno, edge workers, and modern browsers (jsdom +
  // vitest environment). No Buffer fallback needed — keeping this function
  // identical to the browser-mirror copy.
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Generate a 192-bit CSPRNG URL-safe token.
 * Uses `crypto.getRandomValues` (Deno + browsers + Workers).
 * 24 bytes → 32 chars base64url-encoded.
 *
 * Output is URL-safe (A-Z a-z 0-9 - _) — no escaping needed for query strings
 * or path segments. Uniqueness is enforced at DB level by `idx_invites_token`
 * (UNIQUE INDEX).
 *
 * Deterministic-clock-free: no timestamp leakage.
 */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(INVITE_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/**
 * Validate a token shape (not DB presence). Used when accepting an arbitrary
 * forwarded token echo. Returns true iff the token is a 32-char base64url
 * string (no padding).
 */
export function isValidInviteTokenShape(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}

// ========================================================================
// Request validation (incoming body shape)
// ========================================================================

/** Shape of `body` for `admin-create-invite`. */
export interface CreateInviteRequest {
  target_kind: InviteTargetKind;
  target_conversation_id?: string;
  ttl_hours?: number;
}

/** Shape of the validated + normalized invite payload ready for INSERT. */
export interface ValidatedInviteRequest {
  targetKind: InviteTargetKind;
  /** Present iff targetKind === 'conversation'. */
  targetConversationId: string | null;
  /** ISO 8601 UTC timestamptz string. */
  expiresAt: string;
}

/**
 * Validate the raw EF body (parsed already). Throws `InviteValidationError`
 * on first failure. The EF must translate the thrown `code` into the
 * appropriate HTTP response.
 *
 * The function does NOT validate that `target_conversation_id` exists or is
 * owned by the caller — those are DB-level checks done inside the EF.
 *
 * @param body  — the raw parsed body (from `req.json()`)
 * @param now   — Date.now() override for tests; defaults to current time
 */
export function validateCreateInviteRequest(
  body: unknown,
  now: number = Date.now(),
): ValidatedInviteRequest {
  if (!body || typeof body !== 'object') {
    throw new InviteValidationError('MALFORMED_BODY', 'Body must be a JSON object');
  }
  const b = body as Record<string, unknown>;

  // target_kind required + must be in whitelist
  const kind = b.target_kind;
  if (kind !== 'any' && kind !== 'conversation') {
    throw new InviteValidationError(
      'BAD_KIND',
      `target_kind must be 'any' or 'conversation' (got ${JSON.stringify(kind)})`,
    );
  }

  // target_conversation_id required iff target_kind === 'conversation'
  let targetConversationId: string | null = null;
  if (kind === 'conversation') {
    const cid = b.target_conversation_id;
    if (typeof cid !== 'string' || cid.length === 0) {
      throw new InviteValidationError(
        'BAD_CONVERSATION_ID',
        'target_conversation_id is required when target_kind="conversation"',
      );
    }
    // Loose UUID shape check — DB FK existence is checked by the EF.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cid)) {
      throw new InviteValidationError(
        'BAD_CONVERSATION_ID',
        'target_conversation_id must be a UUID',
      );
    }
    targetConversationId = cid;
  }

  // ttl_hours optional within [MIN, MAX]; falls back to default
  const ttl = b.ttl_hours;
  let ttlHours: number;
  if (ttl === undefined || ttl === null) {
    ttlHours = DEFAULT_INVITE_TTL_HOURS;
  } else if (typeof ttl !== 'number' || !Number.isFinite(ttl) || !Number.isInteger(ttl)) {
    throw new InviteValidationError('BAD_TTL', 'ttl_hours must be an integer');
  } else if (ttl < MIN_INVITE_TTL_HOURS || ttl > MAX_INVITE_TTL_HOURS) {
    throw new InviteValidationError(
      'BAD_TTL',
      `ttl_hours must be in [${MIN_INVITE_TTL_HOURS}, ${MAX_INVITE_TTL_HOURS}]`,
    );
  } else {
    ttlHours = ttl;
  }

  return {
    targetKind: kind,
    targetConversationId,
    expiresAt: computeExpiresAt(ttlHours, now),
  };
}

/**
 * Convert ttlHours + now (epoch ms) → ISO 8601 UTC string for the
 * Postgres `TIMESTAMPTZ` column.
 */
export function computeExpiresAt(ttlHours: number, now: number): string {
  const expiresMs = now + ttlHours * 60 * 60 * 1000;
  return new Date(expiresMs).toISOString();
}

/**
 * Build the INSERT payload for `invites` table. Includes the pre-generated
 * token so the EF doesn't need a separate roundtrip.
 *
 * `created_by` is the caller UUID — set by the EF after JWT validation.
 * RLS policy `invites_insert_owner` enforces `created_by = auth.uid()`,
 * so service_role can't bypass: the EF must set this explicitly.
 */
export function buildInviteInsertPayload(args: {
  createdBy: string;
  token: string;
  validated: ValidatedInviteRequest;
}): {
  token: string;
  created_by: string;
  target_kind: InviteTargetKind;
  target_conversation_id: string | null;
  expires_at: string;
} {
  return {
    token: args.token,
    created_by: args.createdBy,
    target_kind: args.validated.targetKind,
    target_conversation_id: args.validated.targetConversationId,
    expires_at: args.validated.expiresAt,
  };
}

/**
 * Compose the public invite URL given a token and the EF's base URL.
 *   `${siteUrl}/invite/${token}`
 * The token is echoed verbatim — no encoding needed (base64url is URL-safe).
 */
export function buildInviteUrl(siteUrl: string, token: string): string {
  // Trim trailing slash to avoid double slash.
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}/invite/${token}`;
}

/**
 * Map a `InviteValidationError.code` to the Nook error envelope code on the
 * 400 response. Pure — used by the EF to compose the response.
 */
export function inviteErrorCode(inviteErr: InviteValidationError): string {
  switch (inviteErr.code) {
    case 'BAD_KIND':
      return 'E_VAL_REQUIRED_FIELD';
    case 'BAD_CONVERSATION_ID':
      return 'E_VAL_INVALID_FORMAT';
    case 'BAD_USER_ID':
      return 'E_VAL_INVALID_FORMAT';
    case 'BAD_TTL':
      return 'E_VAL_INVALID_FORMAT';
    case 'MALFORMED_BODY':
      return 'E_VAL_INVALID_FORMAT';
    case 'BAD_TOKEN':
      return 'E_VAL_INVALID_FORMAT';
  }
}
