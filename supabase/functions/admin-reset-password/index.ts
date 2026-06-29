/**
 * Nook M6-4 · Edge Function · admin-reset-password
 *
 * POST /functions/v1/admin-reset-password
 *
 * Flow:
 *   1. verify_jwt=true (config.toml). Bearer JWT in Authorization header.
 *   2. Resolve user via `supabase.auth.getUser(jwt)` using anon client.
 *   3. Read caller profile; deny with 403 if role != 'owner'.
 *   4. Validate request body (target_user_id UUID, optional ttl).
 *   5. Verify target friend EXISTS in profiles (defense-in-depth:
 *      prevents Owner from generating reset tokens for non-existent
 *      users before frag attempts via the deferred friend-side EF).
 *   6. Generate token (CSPRNG base64url) — REUSES `_shared/invite.ts` so
 *      password-reset and invite tokens are mathematically identical
 *      (entropy, alphabet). Token uniqueness is enforced at DB level
 *      by `idx_invites_token` UNIQUE INDEX.
 *   7. INSERT into invites with target_kind='password_reset' and
 *      target_user_id. INSERT via service_role so we bypass RLS
 *      (created_by is verified = JWT's user_uid BEFORE the INSERT).
 *   8. Compose the public reset URL from env PUBLIC_SITE_URL + token.
 *   9. Return 201 with { id, token, expires_at, target_user_id, reset_url }.
 *
 * SPEC:
 * - F-SEC-04 / CAP-03: Only Owner can issue password-reset tokens.
 * - F-AUTH-04: Token follows same TTL bounds as invites (1..168 hours).
 * - DATA-MODEL R-2: UNIQUE on `invites.token` enforces uniqueness.
 *
 * ⚠️ Friend-side completion (the EF that lets the friend supply their
 * new password once they hit `/reset-password/:token`) is shipped in
 * M6-4.1. The reset URL generated here is meaningful ONLY once M6-4.1
 * lands — until then the friend-side route renders a placeholder.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { handleCors } from '../_shared/cors.ts';
import {
  created,
  badRequest,
  conflict,
  forbidden,
  internalError,
  unauthorized,
} from '../_shared/response.ts';
import {
  InviteValidationError,
  buildInviteUrl,
  computeExpiresAt,
  generateInviteToken,
  inviteErrorCode,
} from '../_shared/invite.ts';

interface CreateResetRequest {
  target_user_id: string;
  ttl_hours?: number;
}

interface ValidatedResetRequest {
  targetUserId: string;
  /** ISO 8601 UTC timestamptz string */
  expiresAt: string;
}

/**
 * Validate the EF body for password reset.
 * Throws InviteValidationError on first failure.
 */
function validateCreateResetRequest(
  body: unknown,
  now: number = Date.now(),
): ValidatedResetRequest {
  if (!body || typeof body !== 'object') {
    throw new InviteValidationError('MALFORMED_BODY', 'Body must be a JSON object');
  }
  const b = body as Record<string, unknown>;

  const targetUserId = b.target_user_id;
  if (typeof targetUserId !== 'string' || targetUserId.length === 0) {
    throw new InviteValidationError(
      'BAD_USER_ID',
      'target_user_id is required',
    );
  }
  // UUID shape check (same regex as invite cid) — defense-in-depth
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)
  ) {
    throw new InviteValidationError(
      'BAD_USER_ID',
      'target_user_id must be a UUID',
    );
  }

  // ttl_hours optional within [MIN_INVITE_TTL_HOURS, MAX_INVITE_TTL_HOURS] (= [1, 168])
  // — reuses the bounds from `_shared/invite.ts` so behavior stays consistent.
  // Falls back to DEFAULT_INVITE_TTL_HOURS (24) when omitted.
  const ttl = b.ttl_hours;
  let ttlHours: number;
  if (ttl === undefined || ttl === null) {
    ttlHours = 24;
  } else if (typeof ttl !== 'number' || !Number.isFinite(ttl) || !Number.isInteger(ttl)) {
    throw new InviteValidationError('BAD_TTL', 'ttl_hours must be an integer');
  } else if (ttl < 1 || ttl > 168) {
    throw new InviteValidationError(
      'BAD_TTL',
      'ttl_hours must be in [1, 168]',
    );
  } else {
    ttlHours = ttl;
  }

  return {
    targetUserId,
    expiresAt: computeExpiresAt(ttlHours, now),
  };
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // ── 1. Extract bearer JWT ────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!jwt) {
      return unauthorized('Missing or malformed Authorization header');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
      return internalError('Server misconfigured');
    }
    const PUBLIC_SITE_URL = Deno.env.get('PUBLIC_SITE_URL') ?? 'http://localhost:5173';

    // ── 2. Resolve user via anon client + JWT ────────────────────
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(jwt);
    if (userErr || !userData.user) {
      console.error('auth.getUser error:', userErr);
      return unauthorized('Invalid or expired session');
    }
    const callerId = userData.user.id;

    // ── 3. Verify caller profile.role === 'owner' ───────────────
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', callerId)
      .maybeSingle();

    if (callerProfileErr) {
      console.error('caller profile lookup error:', callerProfileErr);
      return internalError('Failed to read caller profile');
    }
    if (!callerProfile || callerProfile.role !== 'owner') {
      return forbidden('Only the Owner may issue password resets');
    }

    // ── 4. Validate request body ─────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('E_VAL_INVALID_FORMAT', 'Invalid JSON body');
    }

    let validated;
    try {
      validated = validateCreateResetRequest(body);
    } catch (err) {
      if (err instanceof InviteValidationError) {
        return badRequest(inviteErrorCode(err), err.message);
      }
      throw err;
    }

    // ── 5. Target friend existence check ─────────────────────────
    // Defense-in-depth against Owner generating reset tokens for users
    // who don't exist. Real-world impact: prevents wasted work + ensures
    // the friend-side completion EF (M6-4.1) can find the user.
    const { data: targetProfile, error: targetProfileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name')
      .eq('user_id', validated.targetUserId)
      .maybeSingle();

    if (targetProfileErr) {
      console.error('target profile lookup error:', targetProfileErr);
      return internalError('Failed to look up target profile');
    }
    if (!targetProfile) {
      return badRequest('E_RES_NOT_FOUND', 'Target user does not exist');
    }

    // ── 6. Generate token (REUSES invite helper) ─────────────────
    const token = generateInviteToken();

    // ── 7. INSERT into invites via service_role ──────────────────
    const { data: row, error: insertErr } = await supabaseAdmin
      .from('invites')
      .insert({
        token,
        created_by: callerId,
        target_kind: 'password_reset',
        target_user_id: validated.targetUserId,
        expires_at: validated.expiresAt,
      })
      .select('id, target_user_id, expires_at')
      .single();

    if (insertErr || !row) {
      console.error('invites insert error:', insertErr);
      // M6-4 partial-unique index `idx_invites_password_reset_target_user_pending_unique`
      // (migration 0017) protects against the Owner spam-generating reset
      // tokens for the same friend while a prior reset is still pending.
      // When that constraint fires, Postgres returns unique_violation (23505).
      // We surface a friendly `E_RES_CONFLICT` so the client mapper shows
      // 'settings.passwordReset.error.alreadyPending' rather than the
      // mis-leading 'internal' fallback ('Couldn't create reset link').
      if (insertErr?.code === '23505') {
        return conflict(
          'E_RES_CONFLICT',
          'Friend already has a pending password reset',
        );
      }
      return internalError('Failed to create password reset token');
    }

    // ── 8-9. Compose response with the reset URL ──────────────────
    //
    // URL shape: `${PUBLIC_SITE_URL}/reset-password/${token}`. The
    // friend-side completion EF (M6-4.1) will accept just the token;
    // the route at `/reset-password/:token` is the landing surface.
    //
    // Token-base64url is URL-safe (no `?uid=...` needed) because the
    // EF can resolve target_user_id by lookup-on-token. Cleaner URLs.
    const resetUrl = buildInviteUrl(PUBLIC_SITE_URL, `/reset-password/${token}`);

    return created({
      id: row.id,
      token,
      target_user_id: row.target_user_id,
      expires_at: row.expires_at,
      reset_url: resetUrl,
    });
  } catch (err) {
    console.error('admin-reset-password unexpected error:', err);
    return internalError('An unexpected error occurred');
  }
});
