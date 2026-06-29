/**
 * Nook M6 · Invite helpers — browser/vitest-runnable mirror.
 *
 * This is a VERBATIM mirror of `supabase/functions/_shared/invite.ts`
 * with the same public API + same logic. The Deno EF imports the
 * canonical copy at deploy-time; vitest imports this copy.
 *
 * IMPORTANT: kept in sync via the parity assertions in
 * `src/lib/admin/invite.test.ts`. If you edit EITHER file, edit the
 * OTHER too and re-run vitest — the parity test will catch any drift.
 */

// Re-export constants ------------------------------------------------------------
export const ALLOWED_TARGET_KINDS = ['any', 'conversation'] as const;
export type InviteTargetKind = (typeof ALLOWED_TARGET_KINDS)[number];

export const DEFAULT_INVITE_TTL_HOURS = 24;
export const MIN_INVITE_TTL_HOURS = 1;
export const MAX_INVITE_TTL_HOURS = 168;
export const INVITE_TOKEN_BYTES = 24;

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

// Re-exported types -------------------------------------------------------------
export interface CreateInviteRequest {
  target_kind: InviteTargetKind;
  target_conversation_id?: string;
  ttl_hours?: number;
}

export interface ValidatedInviteRequest {
  targetKind: InviteTargetKind;
  targetConversationId: string | null;
  expiresAt: string;
}

// Pure helpers (mirrored impl) -------------------------------------------------

function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  // `btoa` is available in Deno, edge workers, and modern browsers (jsdom +
  // vitest environment). No Buffer fallback needed — keeping this function
  // identical to the Deno source-of-truth copy.
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateInviteToken(): string {
  const bytes = new Uint8Array(INVITE_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export function isValidInviteTokenShape(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}

export function validateCreateInviteRequest(
  body: unknown,
  now: number = Date.now(),
): ValidatedInviteRequest {
  if (!body || typeof body !== 'object') {
    throw new InviteValidationError('MALFORMED_BODY', 'Body must be a JSON object');
  }
  const b = body as Record<string, unknown>;

  const kind = b.target_kind;
  if (kind !== 'any' && kind !== 'conversation') {
    throw new InviteValidationError(
      'BAD_KIND',
      `target_kind must be 'any' or 'conversation' (got ${JSON.stringify(kind)})`,
    );
  }

  let targetConversationId: string | null = null;
  if (kind === 'conversation') {
    const cid = b.target_conversation_id;
    if (typeof cid !== 'string' || cid.length === 0) {
      throw new InviteValidationError(
        'BAD_CONVERSATION_ID',
        'target_conversation_id is required when target_kind="conversation"',
      );
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cid)) {
      throw new InviteValidationError(
        'BAD_CONVERSATION_ID',
        'target_conversation_id must be a UUID',
      );
    }
    targetConversationId = cid;
  }

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

export function computeExpiresAt(ttlHours: number, now: number): string {
  const expiresMs = now + ttlHours * 60 * 60 * 1000;
  return new Date(expiresMs).toISOString();
}

export function buildInviteInsertPayload(args: {
  createdBy: string;
  token: string;
  validated: ValidatedInviteRequest;
}) {
  return {
    token: args.token,
    created_by: args.createdBy,
    target_kind: args.validated.targetKind,
    target_conversation_id: args.validated.targetConversationId,
    expires_at: args.validated.expiresAt,
  };
}

export function buildInviteUrl(siteUrl: string, token: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}/invite/${token}`;
}

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
