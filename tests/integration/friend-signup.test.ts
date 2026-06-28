/**
 * M2-3 Integration Tests: friend-signup Edge Function
 *
 * Tests CAP-04: Accept Invite (Friend Registration)
 * Covers: F-AUTH-05, F-AUTH-06, BF-04
 *
 * Prerequisites:
 *   - `supabase start` running locally
 *   - `supabase functions serve friend-signup --no-verify-jwt` running
 *   - Migration 20260628000001_init_core_tables.sql applied
 *
 * Run: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  isSupabaseAvailable,
  SKIP_INTEGRATION_TESTS,
  generateTestEmail,
  supabaseHeaders,
  SUPABASE_ANON_KEY,
} from './setup';
import {
  createOwner,
  createInvite,
  createGroupConversation,
  populateConversationMembers,
  callFriendSignup,
  cleanupUser,
  cleanupInvite,
  cleanupConversation,
  cleanupUsers,
  getAdminClient,
  createAuthUserViaAdmin,
  deleteAuthUserViaAdmin,
} from './helpers';

// ── Suite-level skip guard ───────────────────────────────────
// Use synchronous env-var check for module-level skipIf evaluation
const runIntegration = !SKIP_INTEGRATION_TESTS;
let supabaseAvailable = false;

beforeAll(async () => {
  supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    console.warn('Supabase local dev not reachable — tests will fail with network errors');
  }
});

// ── Test Fixtures ─────────────────────────────────────────────

async function setupHappyPathAny() {
  const ownerEmail = generateTestEmail('owner');
  const owner = await createOwner(ownerEmail, 'ownerpass123', '测试Owner');
  const invite = await createInvite(owner, { targetKind: 'any' });
  return {
    owner,
    invite,
    friendEmail: generateTestEmail('friend'),
    friendPassword: 'friendpass123',
    friendDisplayName: '新朋友小明',
    cleanup: async () => {
      await cleanupInvite(invite.id).catch(() => {});
      await cleanupUser(owner.userId).catch(() => {});
    },
  };
}

async function setupHappyPathConversation() {
  const ownerEmail = generateTestEmail('owner');
  const owner = await createOwner(ownerEmail, 'ownerpass123', '测试Owner');
  const groupConv = await createGroupConversation(owner, '测试群');
  const invite = await createInvite(owner, {
    targetKind: 'conversation',
    targetConversationId: groupConv.id,
  });
  return {
    owner,
    invite,
    groupConv,
    friendEmail: generateTestEmail('friend'),
    friendPassword: 'friendpass123',
    friendDisplayName: '新朋友小红',
    cleanup: async () => {
      await cleanupInvite(invite.id).catch(() => {});
      await cleanupConversation(groupConv.id).catch(() => {});
      await cleanupUser(owner.userId).catch(() => {});
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe.skipIf(!runIntegration)(
  'M2-3 · friend-signup EF (CAP-04) — automated integration tests',
  () => {

    describe('✅ Happy paths (201 Created)', () => {

      it('1. target=any — creates user + profile + 1:1 conversation + marks invite used + returns session', async () => {
        const ctx = await setupHappyPathAny();

        try {
          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: ctx.friendPassword,
            display_name: ctx.friendDisplayName,
          });

          // Status
          expect(res.status).toBe(201);

          // Response body shape
          expect(res.body).toHaveProperty('session');
          expect(res.body).toHaveProperty('conversation_id');
          const convId = res.body.conversation_id as string;
          expect(typeof convId).toBe('string');

          const session = res.body.session as Record<string, unknown>;
          expect(session).toHaveProperty('access_token');
          expect(session).toHaveProperty('refresh_token');
          expect(session).toHaveProperty('user');
          const user = session.user as Record<string, unknown>;
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('email');

          // Verify profile was created
          const admin = getAdminClient();
          const { data: profile } = await admin
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          expect(profile).not.toBeNull();
          expect(profile!.display_name).toBe(ctx.friendDisplayName);

          // Verify 1:1 conversation has owner + friend as members
          const { data: members } = await admin
            .from('conversation_members')
            .select('*')
            .eq('conversation_id', convId);

          expect(members).toHaveLength(2);
          const memberUserIds = members!.map((m) => m.user_id).sort();
          expect(memberUserIds).toEqual([ctx.owner.userId, user.id].sort());

          // Verify invite is marked as used
          const { data: updatedInvite } = await admin
            .from('invites')
            .select('used_by, used_at')
            .eq('id', ctx.invite.id)
            .single();

          expect(updatedInvite!.used_by).toBe(user.id);
          expect(updatedInvite!.used_at).not.toBeNull();
        } finally {
          await ctx.cleanup();
        }
      });

      it('2. target=conversation — creates user + profile + joins group', async () => {
        const ctx = await setupHappyPathConversation();

        try {
          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: ctx.friendPassword,
            display_name: ctx.friendDisplayName,
          });

          expect(res.status).toBe(201);
          expect(res.body).toHaveProperty('session');
          expect(res.body).toHaveProperty('conversation_id');
          expect(res.body.conversation_id).toBe(ctx.groupConv.id);

          const session = res.body.session as Record<string, unknown>;
          const user = session.user as Record<string, unknown>;

          // Verify the friend is now a member of the group
          const admin = getAdminClient();
          const { data: members } = await admin
            .from('conversation_members')
            .select('*')
            .eq('conversation_id', ctx.groupConv.id)
            .is('left_at', null);

          const friendMember = members!.find((m) => m.user_id === user.id);
          expect(friendMember).toBeDefined();
          expect(friendMember!.role).toBe('member');

          // Verify Owner is still a member too
          const ownerMember = members!.find((m) => m.user_id === ctx.owner.userId);
          expect(ownerMember).toBeDefined();
        } finally {
          await ctx.cleanup();
        }
      });
    });

    describe('❌ Error paths (invite validation)', () => {

      it('3. Invalid token → 404', async () => {
        const res = await callFriendSignup({
          invite_token: 'nonexistent-token-12345',
          email: generateTestEmail('friend'),
          password: 'friendpass123',
          display_name: '测试',
        });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
        const error = res.body.error as Record<string, unknown>;
        expect(error.code).toBe('E_RES_NOT_FOUND');
      });

      it('4. Expired token → 410 Gone', async () => {
        const ctx = await setupHappyPathAny();

        try {
          const admin = getAdminClient();
          const past = new Date(Date.now() - 60_000).toISOString();
          await admin
            .from('invites')
            .update({ expires_at: past })
            .eq('id', ctx.invite.id);

          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: ctx.friendPassword,
            display_name: ctx.friendDisplayName,
          });

          expect(res.status).toBe(410);
          const error = res.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_RES_INVITE_EXPIRED');
        } finally {
          await ctx.cleanup();
        }
      });

      it('5. Already used token → 410 Gone', async () => {
        const ctx = await setupHappyPathAny();

        try {
          // Create a dummy user to mark the invite as used (raw fetch bypass)
          const admin = getAdminClient();
          const dummy = await createAuthUserViaAdmin({
            email: generateTestEmail('dummy'),
            password: 'dummypass123',
            user_metadata: { role: 'friend', display_name: 'Dummy' },
          });
          const dummyUserId = dummy.id;

          await admin
            .from('invites')
            .update({
              used_by: dummyUserId,
              used_at: new Date().toISOString(),
            })
            .eq('id', ctx.invite.id);

          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: ctx.friendPassword,
            display_name: ctx.friendDisplayName,
          });

          expect(res.status).toBe(410);
          const error = res.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_RES_INVITE_USED');

          await cleanupUser(dummyUserId).catch(() => {});
        } finally {
          await ctx.cleanup();
        }
      });

      it('6. Owner deleted → 410 Gone', async () => {
        const ctx = await setupHappyPathAny();

        try {
          // Delete the owner's invites FIRST (FK constraint on invites.created_by
          // blocks hard-delete of the user when invites still reference it).
          // (Use then(undefined, ...) instead of .catch() because supabase-js
          // PostgrestFilterBuilder implements Promise but doesn't inherit .catch.)
          const admin = getAdminClient();
          await admin.from('invites').delete().eq('created_by', ctx.owner.userId).then(
            () => undefined,
            () => undefined,
          );

          // Delete the owner's auth user (cascades to profile) via raw fetch bypass
          await deleteAuthUserViaAdmin(ctx.owner.userId);

          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: ctx.friendPassword,
            display_name: ctx.friendDisplayName,
          });

          expect(res.status).toBe(410);
          const error = res.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_RES_OWNER_DELETED');
        } finally {
          // Only cleanup any remaining invite rows — owner is already deleted
          await cleanupInvite(ctx.invite.id).catch(() => {});
        }
      });
    });

    describe('❌ Error paths (business rules)', () => {

      it('7. Full conversation (8 members) → 409 Conflict', async () => {
        const ctx = await setupHappyPathConversation();

        try {
          // Fill the conversation with 7 extra members (owner + 7 = 8 total)
          const populatedIds = await populateConversationMembers(ctx.groupConv.id, 7);

          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: ctx.friendPassword,
            display_name: ctx.friendDisplayName,
          });

          expect(res.status).toBe(409);
          const error = res.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_RES_CONVERSATION_FULL');

          await cleanupUsers(populatedIds).catch(() => {});
        } finally {
          await ctx.cleanup();
        }
      });

      it('8. Email already registered → 409 Conflict', async () => {
        const ctx = await setupHappyPathAny();
        const duplicateEmail = generateTestEmail('dupe');

        try {
          // First registration should succeed
          const res1 = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: duplicateEmail,
            password: 'friendpass123',
            display_name: ctx.friendDisplayName,
          });

          expect(res1.status).toBe(201);

          const session1 = res1.body.session as Record<string, unknown>;
          const user1 = session1.user as Record<string, unknown>;
          const friend1Id = user1.id as string;

          // Create a fresh invite for the second attempt
          const invite2 = await createInvite(ctx.owner, { targetKind: 'any' });

          const res2 = await callFriendSignup({
            invite_token: invite2.token,
            email: duplicateEmail,
            password: 'anotherpass456',
            display_name: '重复注册',
          });

          expect(res2.status).toBe(409);
          const error = res2.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_AUTH_EMAIL_EXISTS');

          await cleanupInvite(invite2.id).catch(() => {});
          await cleanupUser(friend1Id).catch(() => {});
        } finally {
          await ctx.cleanup();
        }
      });
    });

    describe('❌ Input validation (400 Bad Request)', () => {

      it('9a. Missing invite_token → 400', async () => {
        const res = await callFriendSignup({
          invite_token: '',
          email: generateTestEmail('friend'),
          password: 'friendpass123',
          display_name: '测试',
        });

        expect(res.status).toBe(400);
      });

      it('9b. Invalid email → 400', async () => {
        const ctx = await setupHappyPathAny();

        try {
          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: 'not-an-email',
            password: 'friendpass123',
            display_name: '测试',
          });

          expect(res.status).toBe(400);
          const error = res.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_VAL_INVALID_FORMAT');
        } finally {
          await ctx.cleanup();
        }
      });

      it('9c. Short password (< 8 chars) → 400', async () => {
        const ctx = await setupHappyPathAny();

        try {
          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: 'short',
            display_name: '测试',
          });

          expect(res.status).toBe(400);
          const error = res.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_VAL_INVALID_FORMAT');
        } finally {
          await ctx.cleanup();
        }
      });

      it('9d. Empty display_name → 400', async () => {
        const ctx = await setupHappyPathAny();

        try {
          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: 'friendpass123',
            display_name: '',
          });

          expect(res.status).toBe(400);
          const error = res.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_VAL_INVALID_FORMAT');
        } finally {
          await ctx.cleanup();
        }
      });

      it('9e. Too long display_name (> 40 chars) → 400', async () => {
        const ctx = await setupHappyPathAny();

        try {
          const res = await callFriendSignup({
            invite_token: ctx.invite.token,
            email: ctx.friendEmail,
            password: 'friendpass123',
            display_name: 'a'.repeat(41),
          });

          expect(res.status).toBe(400);
          const error = res.body.error as Record<string, unknown>;
          expect(error.code).toBe('E_VAL_INVALID_FORMAT');
        } finally {
          await ctx.cleanup();
        }
      });

      it('10. Invalid JSON body → 400', async () => {
        const response = await fetch(
          'http://127.0.0.1:54321/functions/v1/friend-signup',
          {
            method: 'POST',
            headers: supabaseHeaders(SUPABASE_ANON_KEY, {
              'Content-Type': 'application/json',
            }),
            body: 'not-valid-json{',
            signal: AbortSignal.timeout(5000),
          },
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        const error = body.error as Record<string, unknown>;
        expect(error.code).toBe('E_VAL_INVALID_FORMAT');
      });
    });
  },
);
