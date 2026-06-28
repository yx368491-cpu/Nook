/**
 * Integration Test Helpers for M2-3 friend-signup EF + M2-4 RPC
 *
 * Provides:
 * - createOwner(): create a test Owner user and profile
 * - createInvite(): create a test invite
 * - callFriendSignup(): call the friend-signup EF (with proper Supabase headers)
 * - cleanupUser(): delete a test user and all associated data
 * - ensureConversationMembers(): verify conversation membership count
 *
 * Header strategy: every HTTP call sends BOTH `apikey` and `Authorization: Bearer`,
 * which works for both legacy JWT keys and new `sb_publishable_`/`sb_secret_` keys.
 *
 * NOTE 1: @supabase/supabase-js `admin.auth.admin.createUser / deleteUser` is BYPASSED
 * via raw `fetch()` because the JS build of those calls does not reliably include the
 * `Authorization: Bearer <service_role>` header when the client has no session state.
 * GoTrue then rejects with "This endpoint requires a valid Bearer token" even though
 * the key is valid. Direct REST works — proven via curl returning HTTP 200.
 *
 * NOTE 2: PostgRest builders (admin.from(...).insert/delete/update) use try/catch
 * instead of .catch() because supabase-js builders in v2.45+ `implements Promise<T>`
 * (rather than `extends Promise<T>`), so they don't automatically inherit `.catch`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_LOCAL_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  EF_URL,
  supabaseHeaders,
} from './setup';

// ── Typed Supabase clients (PostgREST only) ────────────────────

let _adminClient: SupabaseClient | null = null;
let _anonClient: SupabaseClient | null = null;

/**
 * Wrap createClient with explicit global headers. (Supabase JS v2 sends `apikey`
 * automatically but only sends `Authorization: Bearer` when a session exists; for
 * stateless test clients we add it explicitly so PostgREST requests work uniformly.)
 */
function clientWithHeaders(
  url: string,
  key: string,
  opts: { auth: { autoRefreshToken: boolean; persistSession: boolean } },
): SupabaseClient {
  return createClient(url, key, {
    ...opts,
    global: {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  });
}

/** Get the service_role client — used for PostgREST (RLS-bypass) only. */
export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = clientWithHeaders(SUPABASE_LOCAL_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}

/** Get the anon client — for testing user-facing flows that respect RLS. */
export function getAnonClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = clientWithHeaders(SUPABASE_LOCAL_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _anonClient;
}

// ── Test data type interfaces ──────────────────────────────────

export interface TestOwner {
  userId: string;
  email: string;
  password: string;
  displayName: string;
}

export interface TestInvite {
  id: string;
  token: string;
  targetKind: 'any' | 'conversation';
  targetConversationId: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface TestConversation {
  id: string;
}

export interface FriendSignupResponse {
  status: number;
  body: Record<string, unknown>;
}

// ── Raw-fetch auth admin helpers (bypass @supabase/supabase-js) ──

interface AuthUserCreate {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * Create a GoTrue admin user via raw fetch (bypasses supabase-js admin client).
 * Throws on non-2xx response with the response body in the error message.
 */
export async function createAuthUserViaAdmin(payload: {
  email: string;
  password: string;
  email_confirm?: boolean;
  user_metadata?: Record<string, unknown>;
}): Promise<AuthUserCreate> {
  const res = await fetch(`${SUPABASE_LOCAL_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: supabaseHeaders(SUPABASE_SERVICE_ROLE_KEY, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ email_confirm: true, ...payload }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Auth Admin Create failed: HTTP ${res.status} ${text}`);
  }

  return (await res.json()) as AuthUserCreate;
}

/**
 * Delete a GoTrue admin user via raw fetch (bypasses supabase-js admin client).
 * Returns true on 2xx; false on 404 (already deleted). Throws on other errors.
 */
export async function deleteAuthUserViaAdmin(userId: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_LOCAL_URL}/auth/v1/admin/users/${userId}`,
    {
      method: 'DELETE',
      headers: supabaseHeaders(SUPABASE_SERVICE_ROLE_KEY),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (res.ok) return true;
  if (res.status === 404) return false;
  const text = await res.text().catch(() => '');
  throw new Error(`Auth Admin Delete failed: HTTP ${res.status} ${text}`);
}

// ── Test data creation ────────────────────────────────────────

/**
 * Create a test Owner user via Auth admin API (raw fetch bypass).
 * Returns the user ID + credentials for cleanup.
 */
export async function createOwner(
  email: string,
  password: string,
  displayName: string,
): Promise<TestOwner> {
  const authData = await createAuthUserViaAdmin({
    email,
    password,
    user_metadata: { role: 'owner', display_name: displayName },
  });

  const userId = authData.id;

  // Insert profile via PostgREST (try/catch — PostgRestFilterBuilder in v2.45+
  // implements Promise but doesn't inherit .catch)
  const admin = getAdminClient();
  let profileErr: { message: string } | null = null;
  try {
    const { error } = await admin.from('profiles').insert({
      user_id: userId,
      display_name: displayName,
      language: 'zh-CN',
    });
    if (error) profileErr = error;
  } catch {
    // Fall through
  }

  if (profileErr) {
    try {
      await deleteAuthUserViaAdmin(userId);
    } catch {
      // ignore
    }
    throw new Error(`Failed to create owner profile: ${profileErr.message}`);
  }

  return { userId, email, password, displayName };
}

/**
 * Create a test invite for the given owner.
 */
export async function createInvite(
  owner: TestOwner,
  overrides?: {
    targetKind?: 'any' | 'conversation';
    targetConversationId?: string | null;
    expiresInHours?: number;
    token?: string;
  },
): Promise<TestInvite> {
  const admin = getAdminClient();
  const token =
    overrides?.token ??
    crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const targetKind = overrides?.targetKind ?? 'any';
  const targetConversationId = overrides?.targetConversationId ?? null;
  const expiresInHours = overrides?.expiresInHours ?? 24;

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from('invites')
    .insert({
      token,
      created_by: owner.userId,
      target_kind: targetKind,
      target_conversation_id: targetConversationId,
      expires_at: expiresAt,
    })
    .select('id, token, target_kind, target_conversation_id, created_at, expires_at')
    .single();

  if (error) {
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  return {
    id: data.id,
    token: data.token,
    targetKind: data.target_kind as 'any' | 'conversation',
    targetConversationId: data.target_conversation_id as string | null,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

/**
 * Create a test group conversation with the owner as member.
 */
export async function createGroupConversation(
  owner: TestOwner,
  name?: string,
): Promise<TestConversation> {
  const admin = getAdminClient();

  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .insert({
      kind: 'group',
      name: name ?? 'Test Group',
      created_by: owner.userId,
    })
    .select('id')
    .single();

  if (convErr) {
    throw new Error(`Failed to create conversation: ${convErr.message}`);
  }

  const { error: memErr } = await admin.from('conversation_members').insert({
    conversation_id: conv.id,
    user_id: owner.userId,
    role: 'owner',
  });

  if (memErr) {
    try {
      await admin.from('conversations').delete().eq('id', conv.id);
    } catch {
      // ignore
    }
    throw new Error(`Failed to add owner to conversation: ${memErr.message}`);
  }

  return { id: conv.id };
}

/**
 * Fill a conversation with N existing members (excluding owner).
 * Returns the list of member user IDs created.
 */
export async function populateConversationMembers(
  conversationId: string,
  count: number,
): Promise<string[]> {
  const admin = getAdminClient();
  const memberIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const email = `populate-${Date.now()}-${i}@nook-test.example`;
    const password = 'testpass123';

    // Raw fetch bypass for auth user creation (avoids supabase-js auth header bug)
    const authData = await createAuthUserViaAdmin({
      email,
      password,
      user_metadata: { role: 'friend', display_name: `Populated User ${i}` },
    }).catch(() => null);

    if (!authData) continue;
    const userId = authData.id;

    // Try-catch instead of .catch on PostgRest builder
    try {
      await admin.from('profiles').insert({
        user_id: userId,
        display_name: `Populated User ${i}`,
        language: 'zh-CN',
      });
    } catch {
      // ignore
    }

    try {
      const { error: memErr } = await admin
        .from('conversation_members')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: 'member',
        });
      if (!memErr) memberIds.push(userId);
    } catch {
      // ignore
    }
  }

  return memberIds;
}

// ── EF HTTP call ──────────────────────────────────────────────

export interface FriendSignupRequest {
  invite_token: string;
  email: string;
  password: string;
  display_name: string;
}

/**
 * Call the friend-signup Edge Function with the given payload.
 * Returns the HTTP status code and parsed response body.
 *
 * Sends both `apikey` and `Authorization: Bearer` headers — required for the
 * new `sb_publishable_`/`sb_secret_` key format, harmless for legacy JWT.
 */
export async function callFriendSignup(
  payload: FriendSignupRequest,
): Promise<FriendSignupResponse> {
  const response = await fetch(EF_URL, {
    method: 'POST',
    headers: supabaseHeaders(SUPABASE_ANON_KEY, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  const status = response.status;
  let body: Record<string, unknown>;
  try {
    body = await response.json();
  } catch {
    body = { raw: await response.text() };
  }
  return { status, body };
}

// ── Cleanup ───────────────────────────────────────────────────

/**
 * Delete a user and all associated data.
 * Cleanup order respects FK constraints; errors are silently swallowed.
 */
export async function cleanupUser(userId: string): Promise<void> {
  const admin = getAdminClient();

  // Step 1: Delete invites (no CASCADE on invites.created_by / used_by)
  try {
    await admin.from('invites').delete().eq('created_by', userId);
  } catch {
    // ignore
  }
  try {
    await admin.from('invites').delete().eq('used_by', userId);
  } catch {
    // ignore
  }

  // Step 2: Delete profile
  try {
    await admin.from('profiles').delete().eq('user_id', userId);
  } catch {
    // ignore
  }

  // Step 3: Delete auth user via raw fetch bypass (.catch works on regular Promise)
  await deleteAuthUserViaAdmin(userId).catch(() => {});
}

export async function cleanupUsers(userIds: string[]): Promise<void> {
  await Promise.allSettled(userIds.map(cleanupUser));
}

export async function cleanupInvite(inviteId: string): Promise<void> {
  const admin = getAdminClient();
  try {
    await admin.from('invites').delete().eq('id', inviteId);
  } catch {
    // ignore
  }
}

export async function cleanupConversation(conversationId: string): Promise<void> {
  const admin = getAdminClient();
  try {
    await admin.from('conversations').delete().eq('id', conversationId);
  } catch {
    // ignore
  }
}

export async function cleanupAuthUser(userId: string): Promise<void> {
  const admin = getAdminClient();
  try {
    await admin.from('profiles').delete().eq('user_id', userId);
  } catch {
    // ignore
  }
  await deleteAuthUserViaAdmin(userId).catch(() => {});
}
