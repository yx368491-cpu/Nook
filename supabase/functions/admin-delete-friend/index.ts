/**
 * Nook M6-5 · Edge Function · admin-delete-friend
 *
 * POST /functions/v1/admin-delete-friend
 *
 * Flow:
 *   1. verify_jwt=true (config.toml). Bearer JWT in Authorization header.
 *   2. Resolve user via `supabase.auth.getUser(jwt)` using anon client.
 *   3. Read caller profile; deny with 403 if role != 'owner'.
 *   4. Validate request body (target_user_id UUID).
 *   5. Verify target profile EXISTS in profiles AND role != 'owner'
 *      (defense-in-depth — RPC layer ALSO refuses owner self-delete).
 *   6. Call atomic RPC `fn_admin_delete_friend(target_user_id)` via
 *      service_role → marks profile.deleted_at AND conversation_members.left_at
 *      in one transaction. Idempotent on re-call.
 *   7. Return 200 with { id, target_user_id, deleted_at, conversations_left }.
 *
 * SPEC:
 * - F-SEC-06 / CAP-20: Only Owner can soft-delete friends.
 * - BF-14: Soft-delete preserves message history (sender_id FK stays valid).
 *   The friend is rendered "inactive" in old message labels via the
 *   `profiles.deleted_at` column read in MessageItem.senderName rendering.
 *
 * ⚠️ Hard delete (auth.admin.deleteUser) is NOT implemented — F-SEC-06
 * explicitly mandates soft-delete so historical messages remain
 * attributable. BF-14 inactive-friend UX depends on the profile row
 * staying around.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { handleCors } from '../_shared/cors.ts';
import {
  ok,
  badRequest,
  forbidden,
  internalError,
  unauthorized,
} from '../_shared/response.ts';

interface DeleteFriendRequest {
  target_user_id: string;
}

interface ValidatedDeleteFriendRequest {
  targetUserId: string;
}

/**
 * Local validation error class. Mirrors `InviteValidationError` shape
 * so the EF envelope contract is symmetric with M6-4 admin-reset-password.
 * Keeping the local class (rather than reusing InviteValidationError
 * directly) avoids cross-coupling — the M6-5 surface never raises a
 * 'BAD_TTL' or 'BAD_TOKEN' code that the M6-4 switch maps.
 */
class DeleteFriendValidationError extends Error {
  readonly code: 'BAD_USER_ID' | 'MALFORMED_BODY';
  constructor(code: 'BAD_USER_ID' | 'MALFORMED_BODY', message: string) {
    super(message);
    this.code = code;
    this.name = 'DeleteFriendValidationError';
  }
}

function deleteFriendErrorCode(err: DeleteFriendValidationError): string {
  switch (err.code) {
    case 'BAD_USER_ID':
      return 'E_VAL_INVALID_FORMAT';
    case 'MALFORMED_BODY':
      return 'E_VAL_INVALID_FORMAT';
  }
}

function validateDeleteFriendRequest(body: unknown): ValidatedDeleteFriendRequest {
  if (!body || typeof body !== 'object') {
    throw new DeleteFriendValidationError(
      'MALFORMED_BODY',
      'Body must be a JSON object',
    );
  }
  const b = body as Record<string, unknown>;

  const targetUserId = b.target_user_id;
  if (typeof targetUserId !== 'string' || targetUserId.length === 0) {
    throw new DeleteFriendValidationError(
      'BAD_USER_ID',
      'target_user_id is required',
    );
  }
  // UUID shape check — defense-in-depth matched to existing helpers.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      targetUserId,
    )
  ) {
    throw new DeleteFriendValidationError(
      'BAD_USER_ID',
      'target_user_id must be a UUID',
    );
  }
  return { targetUserId };
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
      return forbidden('Only the Owner may delete friends');
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
      validated = validateDeleteFriendRequest(body);
    } catch (err) {
      if (err instanceof DeleteFriendValidationError) {
        return badRequest(deleteFriendErrorCode(err), err.message);
      }
      throw err;
    }

    // ── 5. Target profile existence + role check ─────────────────
    // Defense-in-depth: refuse target=owner BEFORE the RPC call so
    // the user-facing error is HTTP 403 + E_AUTH_FORBIDDEN rather
    // than an E_AUTH_FORBIDDEN_OWNER_DELETE raised exception which
    // would map to internalError. The RPC is ALSO defensive.
    const { data: targetProfile, error: targetProfileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, role')
      .eq('user_id', validated.targetUserId)
      .maybeSingle();

    if (targetProfileErr) {
      console.error('target profile lookup error:', targetProfileErr);
      return internalError('Failed to look up target profile');
    }
    if (!targetProfile) {
      return badRequest('E_RES_NOT_FOUND', 'Friend does not exist');
    }
    if (targetProfile.role === 'owner') {
      return forbidden('Cannot delete the Owner');
    }

    // ── 6. Atomic soft-delete via fn_admin_delete_friend ─────────
    // The RPC handles: row lock, role check (defense-in-depth),
    // idempotency, and the dual UPDATE inside one transaction.
    type RpcResult = Array<{ deleted_at: string; conversations_left: number }>;
    const { data, error } = await supabaseAdmin.rpc<RpcResult>(
      'fn_admin_delete_friend',
      {
        p_target_user_id: validated.targetUserId,
      },
    );

    if (error || !data) {
      console.error('fn_admin_delete_friend error:', error);
      const msg = error?.message ?? '';
      if (msg.includes('E_RES_NOT_FOUND')) {
        return badRequest('E_RES_NOT_FOUND', 'Friend no longer exists');
      }
      if (msg.includes('E_AUTH_FORBIDDEN_OWNER_DELETE')) {
        // Should be unreachable thanks to step 5 — kept as a safety net
        // if a future migration drops the profiles_one_owner_uidx guard
        // and a non-Owner profile is somehow promoted.
        return forbidden('Cannot delete the Owner');
      }
      return internalError('Failed to delete friend');
    }
    if (data.length === 0) {
      // RPC succeeded but returned no rows — should never happen with
      // the FOR UPDATE lock + raise on NOT FOUND. Surface as internal
      // so we don't mask the bug as success.
      console.error('fn_admin_delete_friend returned no rows:', { data });
      return internalError('Failed to delete friend');
    }

    const row = data[0];
    // ── 7. Compose response ──────────────────────────────────────
    return ok({
      id: validated.targetUserId,
      target_user_id: validated.targetUserId,
      deleted_at: row.deleted_at,
      conversations_left: row.conversations_left,
    });
  } catch (err) {
    console.error('admin-delete-friend unexpected error:', err);
    return internalError('An unexpected error occurred');
  }
});
