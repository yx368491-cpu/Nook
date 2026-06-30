/**
 * Nook M6-4.1 · Edge Function · reset-password-complete
 *
 * POST /functions/v1/reset-password-complete
 * Auth: verify_jwt=false — the one-time token is the caller's credential.
 *
 * Flow:
 *   1. Accepts `{ token, password }` from the anonymous form at
 *      `/reset-password/:token`.
 *   2. Validates token shape (32-char base64url) + password (≥8 chars).
 *   3. Looks up `invites` row by token.
 *   4. Verifies: row exists, target_kind='password_reset', not expired,
 *      not used, not revoked.
 *   5. Resolves target_user_id from the invite row.
 *   6. Updates auth.users password via `auth.admin.updateUserById()`
 *      (requires service_role).
 *   7. Marks the invite as used (used_at = now, used_by = target_user_id).
 *   8. Returns 200 with { success: true, message }.
 *
 * SPEC:
 * - F-AUTH-07: One-time token with TTL bounds (inherited from invite constants).
 * - AC.16: Friend can reset password without Owner involvement.
 * - D-03 push ban: No email delivery — Owner hands the URL via WeChat/text.
 *
 * ⚠️ This EF is intentionally stateless (no session returned). The friend
 * must log in with their new password after a successful reset. This keeps
 * the EF's surface minimal and avoids session-storage complexity on an
 * anonymous endpoint.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { handleCors } from '../_shared/cors.ts';
import {
  ok,
  badRequest,
  notFound,
  gone,
  internalError,
} from '../_shared/response.ts';

// ========================================================================
// Validation
// ========================================================================

interface ResetCompleteRequest {
  token: string;
  password: string;
}

function validateBody(body: unknown): ResetCompleteRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('MALFORMED_BODY', 'Body must be a JSON object');
  }
  const b = body as Record<string, unknown>;

  const token = b.token;
  if (typeof token !== 'string' || token.length === 0) {
    throw new ValidationError('BAD_TOKEN', 'token is required');
  }
  // 32-char base64url shape (matching generateInviteToken output)
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) {
    throw new ValidationError('BAD_TOKEN', 'token has invalid format');
  }

  const password = b.password;
  if (typeof password !== 'string' || password.length < 8) {
    throw new ValidationError(
      'BAD_PASSWORD',
      'Password must be at least 8 characters',
    );
  }

  return { token, password };
}

class ValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ValidationError';
  }
}

function validationErrorCode(err: ValidationError): string {
  switch (err.code) {
    case 'MALFORMED_BODY':
      return 'E_VAL_INVALID_FORMAT';
    case 'BAD_TOKEN':
      return 'E_VAL_INVALID_FORMAT';
    case 'BAD_PASSWORD':
      return 'E_VAL_INVALID_FORMAT';
    default:
      return 'E_VAL_INVALID_FORMAT';
  }
}

// ========================================================================
// EF handler
// ========================================================================

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // ── 1. Validate request body ──────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('E_VAL_INVALID_FORMAT', 'Invalid JSON body');
    }

    let validated: ResetCompleteRequest;
    try {
      validated = validateBody(body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return badRequest(validationErrorCode(err), err.message);
      }
      throw err;
    }

    // ── 2. Create service_role client ─────────────────────────────
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
      return internalError('Server misconfigured');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 3. Look up invite by token ────────────────────────────────
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('invites')
      .select('*')
      .eq('token', validated.token)
      .single();

    if (inviteErr || !invite) {
      // No row at all → indistinguishable from "not found" or "wrong format"
      return notFound('Reset token not found');
    }

    // ── 4. Validate invite state ───────────────────────────────────
    // 4a. Must be a password_reset token
    if (invite.target_kind !== 'password_reset') {
      return badRequest(
        'E_VAL_INVALID_FORMAT',
        'This token is not a password reset token',
      );
    }

    // 4b. Not expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return gone('E_RES_TOKEN_EXPIRED', 'This reset link has expired');
    }

    // 4c. Not already used
    if (invite.used_at || invite.used_by) {
      return gone('E_RES_TOKEN_USED', 'This reset link has already been used');
    }

    // 4d. Not revoked
    if (invite.revoked_at) {
      return gone('E_RES_TOKEN_REVOKED', 'This reset link has been revoked by the Owner');
    }

    // 4e. Must have a target_user_id
    if (!invite.target_user_id) {
      console.error('password_reset invite missing target_user_id:', invite.id);
      return internalError('Invalid reset token state');
    }

    const targetUserId: string = invite.target_user_id;

    // ── 5. Update the user's password via GoTrue admin API ────────
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: validated.password },
    );

    if (updateErr) {
      console.error('updateUserById error:', updateErr);

      // Map known GoTrue errors
      if (updateErr.status === 422 && updateErr.code === 'weak_password') {
        return badRequest(
          'E_VAL_INVALID_FORMAT',
          'Password is too weak',
        );
      }
      if (updateErr.status === 404) {
        return notFound('User account not found');
      }

      return internalError('Failed to update password');
    }

    // ── 6. Mark invite as used ────────────────────────────────────
    const { error: markErr } = await supabaseAdmin
      .from('invites')
      .update({
        used_by: targetUserId,
        used_at: new Date().toISOString(),
      })
      .eq('token', validated.token);

    if (markErr) {
      // Non-fatal: password was already updated. Log and continue.
      console.error('Failed to mark invite as used:', markErr);
    }

    // ── 7. Success response ──────────────────────────────────────
    return ok({
      success: true,
      message: 'Password updated successfully. You can now log in.',
    });
  } catch (err) {
    console.error('reset-password-complete unexpected error:', err);
    return internalError('An unexpected error occurred');
  }
});
