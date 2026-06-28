import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { created, badRequest, notFound, gone, conflict, internalError } from '../_shared/response.ts';

interface FriendSignupRequest {
  invite_token: string;
  email: string;
  password: string;
  display_name: string;
}

/**
 * POST /functions/v1/friend-signup — CAP-04
 *
 * One-stop handler for friend invitation signup:
 * 1. Validate invite token (not expired, not used, owner exists)
 * 2. Create auth user (auto-confirmed, no email verification)
 * 3. Insert profile (role='friend')
 * 4. Create 1:1 conversation (if target_kind='any') or join existing group
 * 5. Mark invite as used
 * 6. Sign in and return session + conversation_id
 */
serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // ── Parse & validate input ─────────────────────────────────
    let body: FriendSignupRequest;
    try {
      body = await req.json();
    } catch {
      return badRequest('E_VAL_INVALID_FORMAT', 'Invalid JSON body');
    }

    const { invite_token, email, password, display_name } = body;

    if (!invite_token || typeof invite_token !== 'string') {
      return badRequest('E_VAL_REQUIRED_FIELD', 'invite_token is required');
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return badRequest('E_VAL_INVALID_FORMAT', 'Valid email is required');
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return badRequest('E_VAL_INVALID_FORMAT', 'Password must be at least 8 characters');
    }
    if (!display_name || typeof display_name !== 'string' || display_name.length < 1 || display_name.length > 40) {
      return badRequest('E_VAL_INVALID_FORMAT', 'Display name must be 1–40 characters');
    }

    // ── Create service_role client ──────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── Validate invite ─────────────────────────────────────────
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('invites')
      .select('*')
      .eq('token', invite_token)
      .single();

    if (inviteErr || !invite) {
      return notFound('Invite not found');
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return gone('E_RES_INVITE_EXPIRED', 'This invite has expired (24h limit)');
    }

    // Check if already used
    if (invite.used_at || invite.used_by) {
      return gone('E_RES_INVITE_USED', 'This invite has already been used');
    }

    // Check if owner (inviter) still exists
    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', invite.created_by)
      .maybeSingle();

    if (!ownerProfile) {
      return gone('E_RES_OWNER_DELETED', 'The person who invited you no longer has a Nook account');
    }

    // Check if target conversation still exists and is not full (if target=conversation)
    const targetKind = invite.target_kind ?? 'any';
    const targetConversationId = invite.target_conversation_id;
    if (targetKind === 'conversation' && targetConversationId) {
      const { data: targetConv } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('id', invite.target_conversation_id)
        .single();

      if (!targetConv) {
        return gone('E_RES_NOT_FOUND', 'The target conversation no longer exists');
      }

      // Check member cap (≤ 8 active members)
      const { count: memberCount } = await supabaseAdmin
        .from('conversation_members')
        .select('*', { head: true, count: 'exact' })
        .eq('conversation_id', invite.target_conversation_id)
        .is('left_at', null);

      if (memberCount != null && memberCount >= 8) {
        return conflict('E_RES_CONVERSATION_FULL', 'The target conversation is full (max 8 members)');
      }
    }

    // ── Create auth user (auto-confirmed) ───────────────────────
    // Rely on GoTrue's atomic createUser response for duplicate-email detection;
    // an explicit pre-check (e.g. `listUsers()`) is racy with pagination and can
    // miss recent registrations. The error is mapped to a 409 below.
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'friend', display_name },
    });

    if (authErr) {
      console.error('createUser error:', authErr);

      // Map known GoTrue 422 errors to the project's API conventions.
      //
      // @supabase/supabase-js surfaces GoTrue's `code` + `status` directly on
      // the AuthError. For v2.49, a duplicate email lands here as:
      //   { status: 422, code: 'email_exists', message: 'User already registered' }
      if (authErr.status === 422 && authErr.code === 'email_exists') {
        return conflict('E_AUTH_EMAIL_EXISTS', 'This email is already registered');
      }
      if (authErr.status === 422 && authErr.code === 'weak_password') {
        return badRequest('E_VAL_INVALID_FORMAT', 'Password is too weak');
      }

      return internalError('Failed to create user account');
    }

    const userId = authData.user!.id;

    // ── Insert profile (role='friend') ──────────────────────────
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        display_name,
        language: 'zh-CN',
      });

    if (profileErr) {
      console.error('profile insert error:', profileErr);
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return internalError('Failed to create profile');
    }    // ── Create conversation & membership ────────────────────────
    let conversationId: string | null = null;

    if (targetKind === 'any') {
      // Create 1:1 conversation between Owner and Friend
      const { data: conv, error: convErr } = await supabaseAdmin
        .from('conversations')
        .insert({
          kind: 'direct',
          name: null,
          created_by: invite.created_by, // Owner created it
        })
        .select('id')
        .single();

      if (convErr) {
        console.error('conversation insert error:', convErr);
        await rollbackUser(supabaseAdmin, userId);
        return internalError('Failed to create conversation');
      }

      conversationId = conv.id;

      // Insert 2 conversation_members (Owner + Friend)
      const { error: memErr } = await supabaseAdmin
        .from('conversation_members')
        .insert([
          { conversation_id: conversationId, user_id: invite.created_by, role: 'owner' },
          { conversation_id: conversationId, user_id: userId, role: 'member' },
        ]);

      if (memErr) {
        console.error('members insert error:', memErr);
        await rollbackUser(supabaseAdmin, userId);
        await supabaseAdmin.from('conversations').delete().eq('id', conversationId);
        return internalError('Failed to add conversation members');
      }
    } else if (targetKind === 'conversation' && targetConversationId) {
      // Add friend as member to existing conversation
      conversationId = invite.target_conversation_id;

      // Pre-check: not already an active member
      const { data: existingMember } = await supabaseAdmin
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .is('left_at', null)
        .maybeSingle();

      if (existingMember) {
        await rollbackUser(supabaseAdmin, userId);
        return conflict('E_RES_ALREADY_MEMBER', 'You are already a member of this conversation');
      }

      const { error: memErr } = await supabaseAdmin
        .from('conversation_members')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: 'member',
        });

      if (memErr) {
        console.error('member insert error:', memErr);
        await rollbackUser(supabaseAdmin, userId);
        return internalError('Failed to join conversation');
      }
    }

    // ── Mark invite as used (atomically: only if not yet used) ───
    const { error: markErr, count: markCount } = await supabaseAdmin
      .from('invites')
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq('token', invite_token)
      .is('used_at', null)
      .select('token', { count: 'exact', head: true });

    if (markErr) {
      console.error('mark invite used error:', markErr);
    } else if (markCount === 0) {
      // Invite was already used by another request (race condition guard)
      console.warn('Invite already used by another request:', invite_token);
      // User is already created, so we don't roll back; client can still proceed
    }

    // ── Sign in to get session for the new user ─────────────────
    // We need to sign in with the anon key client, not the service_role client
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr || !signInData.session) {
      console.error('signIn after signup error:', signInErr);
      // The user is created but we can't return a session.
      // Return the user info so the client can redirect to login.
      return created({
        userId,
        email,
        conversation_id: conversationId,
        session: null,
        message: 'Account created. Please log in.',
      });
    }

    // ── Success response ────────────────────────────────────────
    return created({
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: {
          id: userId,
          email,
        },
      },
      conversation_id: conversationId,
    });
  } catch (err) {
    console.error('friend-signup unexpected error:', err);
    return internalError('An unexpected error occurred');
  }
});

/**
 * Rollback: delete the auth user if subsequent steps fail.
 * This keeps the system clean even on partial failures.
 */
async function rollbackUser(supabase: ReturnType<typeof createClient>, userId: string) {
  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch {
    console.error('Failed to rollback user:', userId);
  }
}
