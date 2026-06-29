/**
 * Nook M6 · Edge Function · admin-create-invite
 *
 * POST /functions/v1/admin-create-invite
 *
 * Flow:
 *   1. verify_jwt=true (config.toml). Bearer JWT in Authorization header.
 *   2. Resolve user via `supabase.auth.getUser(jwt)` using anon client so
 *      GoTrue validates signature + expiry.
 *   3. Read caller profile; deny with 403 if role != 'owner'.
 *   4. Validate request body (target_kind, optional cid, optional ttl).
 *   5. If target_kind=conversation: read conversation row, verify owner.
 *   6. Generate token (CSPRNG base64url) via shared helper.
 *   7. INSERT into invites via service_role (bypasses RLS — created_by is
 *      verified to be the caller; row is correctly attributable).
 *   8. Compose the public invite URL from env PUBLIC_SITE_URL + token.
 *   9. Return 201 with { id, token, expires_at, target_kind,
 *      target_conversation_id, invite_url }.
 *
 * SPEC:
 * - F-SEC-04 / CAP-03: Only Owner can create invites.
 * - F-AUTH-03: Token is non-guessable.
 * - F-AUTH-04: TTL bounded [1..168] hours, default 24.
 * - F-AUTH-07: target_kind ∈ { 'any', 'conversation' }.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { handleCors } from '../_shared/cors.ts';
import {
  created,
  badRequest,
  forbidden,
  internalError,
  unauthorized,
} from '../_shared/response.ts';
import {
  InviteValidationError,
  buildInviteInsertPayload,
  buildInviteUrl,
  generateInviteToken,
  inviteErrorCode,
  validateCreateInviteRequest,
} from '../_shared/invite.ts';

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
    const userId = userData.user.id;

    // ── 3. Verify caller profile.role === 'owner' ───────────────
    // Use service_role to read profile (bypasses RLS).
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileErr) {
      console.error('profile lookup error:', profileErr);
      return internalError('Failed to read profile');
    }
    if (!profile || profile.role !== 'owner') {
      return forbidden('Only the Owner may issue invites');
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
      validated = validateCreateInviteRequest(body);
    } catch (err) {
      if (err instanceof InviteValidationError) {
        return badRequest(inviteErrorCode(err), err.message);
      }
      throw err;
    }

    // ── 5. Conversation ownership check (target_kind=conversation)
    if (validated.targetKind === 'conversation' && validated.targetConversationId) {
      const { data: conv, error: convErr } = await supabaseAdmin
        .from('conversations')
        .select('id, created_by')
        .eq('id', validated.targetConversationId)
        .maybeSingle();

      if (convErr) {
        console.error('conversation lookup error:', convErr);
        return internalError('Failed to look up conversation');
      }
      if (!conv) {
        return badRequest('E_RES_NOT_FOUND', 'Conversation does not exist');
      }
      if (conv.created_by !== userId) {
        return forbidden('You do not own this conversation');
      }
    }

    // ── 6. Generate token ─────────────────────────────────────────
    const token = generateInviteToken();

    // ── 7. INSERT via service_role ────────────────────────────────
    const insertPayload = buildInviteInsertPayload({
      createdBy: userId,
      token,
      validated,
    });
    const { data: row, error: insertErr } = await supabaseAdmin
      .from('invites')
      .insert(insertPayload)
      .select('id, target_kind, target_conversation_id, expires_at')
      .single();

    if (insertErr || !row) {
      console.error('invites insert error:', insertErr);
      return internalError('Failed to create invite');
    }

    // ── 8-9. Compose response ─────────────────────────────────────
    const inviteUrl = buildInviteUrl(PUBLIC_SITE_URL, token);

    return created({
      id: row.id,
      token,
      target_kind: row.target_kind,
      target_conversation_id: row.target_conversation_id,
      expires_at: row.expires_at,
      invite_url: inviteUrl,
    });
  } catch (err) {
    console.error('admin-create-invite unexpected error:', err);
    return internalError('An unexpected error occurred');
  }
});
