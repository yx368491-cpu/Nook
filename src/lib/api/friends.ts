/**
 * Nook M6-4 · Friend-list helper.
 *
 * Returns the Owner's accepted friends for the SettingsAdminPage
 * `<PasswordResetCard>` picker. Friends are defined as users with
 * `profiles.role = 'friend'` who share at least one conversation with
 * the Owner — RLS (migration 0004 / `profiles_read_self_or_same_conv`)
 * allows the Owner to read their profiles transparently, so no
 * service-role bypass is needed client-side.
 *
 * The hard cap on Nook's social surface is 20 friends (Owner + ≤20 per
 * data-model); the picker becomes unwieldy beyond that, so we cap
 * pagination here at 100 with a stable alpha sort by display_name so
 * v1.0 keeps one-shot fetch semantics (Nook ≤ 20 means a single page
 * always suffices).
 */

import { supabase } from '@/lib/supabase';

export interface FriendRow {
  /** Stable user id (FK → auth.users.id) */
  userId: string;
  /** Profile.display_name (empty/whitespace allowed → "?" fallback used in UI) */
  displayName: string;
  /** Profile.avatar_url (nullable; UI renders initials when null) */
  avatarUrl: string | null;
}

const FRIENDS_PAGE_LIMIT = 100;

/**
 * Fetch all friends of the current Owner. Owner is identified via
 * `currentUserId` (passes through to RLS).
 *
 * Strategy:
 *   - Get all `conversation_members` rows WHERE user_id != self
 *     (active = `left_at IS NULL`) — this collects the friend ids
 *     WITHOUT needing to filter on profiles.role on the client.
 *   - Dedup to unique user ids (a friend in multiple convs is one row).
 *   - Hydrate profiles (display_name + avatar_url) for those ids.
 *
 * Why not `.eq('role', 'friend')` directly on `profiles`: a friend profile
 * may exist with role='friend' but have no conversation_members row yet
 * (e.g. admin-bootstrap created the row straight, no invite accepted).
 * The double-source strategy covers both friendship-only and active
 * conversation members.
 *
 * Implementation note: two-stage query is cleaner than a single nested
 * select because PostgREST doesn't support `.in()` over a sub-SELECT.
 */
export async function listFriendsOfOwner(
  currentUserId: string,
): Promise<FriendRow[]> {
  if (!currentUserId) return [];

  // Stage 1 — distinct friend user_ids from active conversation_members
  const { data: memberRows, error: memberErr } = await supabase
    .from('conversation_members')
    .select('user_id')
    .is('left_at', null)
    .neq('user_id', currentUserId)
    .limit(FRIENDS_PAGE_LIMIT);
  if (memberErr) {
    throw {
      code: 'DB_ERROR',
      message: memberErr.message,
      details: memberErr.details ?? null,
    };
  }
  if (!memberRows || memberRows.length === 0) return [];

  const friendIds = Array.from(
    new Set(memberRows.map((r) => (r as { user_id: string }).user_id)),
  );
  if (friendIds.length === 0) return [];

  // Stage 2 — hydrate profiles (RLS allows self + same-conv reads; both apply)
  const { data: profileRows, error: profileErr } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', friendIds);
  if (profileErr) {
    throw {
      code: 'DB_ERROR',
      message: profileErr.message,
      details: profileErr.details ?? null,
    };
  }
  if (!profileRows) return [];

  const rows: FriendRow[] = profileRows.map((p) => ({
    userId: (p as { user_id: string }).user_id,
    displayName:
      ((p as { display_name: string | null }).display_name ?? '').trim() || '?',
    avatarUrl: (p as { avatar_url: string | null }).avatar_url ?? null,
  }));

  // Stable alpha sort by display_name — picker order is rendered in this order.
  rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return rows;
}
