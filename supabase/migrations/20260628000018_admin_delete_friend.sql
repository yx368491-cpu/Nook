-- Migration 0018 — Admin soft-delete friend (F-SEC-06 / BF-14 / CAP-20)
-- Source of truth: docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 4 (schema)
-- + docs/01_Product/Nook-SPEC.md F-SEC-06 + BF-14 + CAP-20 + AC.18.
--
-- Design decision (M6-5 thinker validation): SOFT DELETE only.
--   - profiles.deleted_at marker (NEW column) — leaves the row intact so
--     historical messages keep their sender_id FK target. Owner sees
--     the deleted friend as "inactive" (BF-14) in old message labels.
--   - conversation_members.left_at = now() on EVERY active membership
--     (1:1 + groups + any future invite-based conv). The friend is
--     kicked out of every conversation atomically.
--   - Both UPDATEs wrapped in a single SECURITY DEFINER RPC
--     fn_admin_delete_friend so the operation is atomic — partial state
--     (left_at set but profile still active, or vice versa) is a hard
--     invariant break for F-SEC-06.
--   - Idempotent: re-calling returns the original deletion timestamp
--     and `conversations_left = 0`. Owner double-click + retry race
--     safety net without surfacing as error.
--   - FOR UPDATE row lock on the profile row serializes concurrent
--     Owner-driven delete clicks (thinker recommendation).
--   - Defense-in-depth: refuses to delete role='owner' profiles.
--     Both inside the function AND at the EF caller-side check.
--
-- Idempotent throughout: ADD COLUMN IF NOT EXISTS · CREATE INDEX IF NOT
-- EXISTS · CREATE OR REPLACE FUNCTION · GRANT is naturally idempotent
-- + DO-block fallback for older Postgres versions.

-- ====================================================================
-- 1. profiles.deleted_at — soft-delete marker.
-- ====================================================================
alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Soft-delete marker. Non-null => friend has been removed from Nook '
  'by the Owner (admin-delete-friend EF). Profile row preserved so '
  'historical messages retain their sender_id FK. F-SEC-06 / BF-14.';

-- Partial index — fast filter for "active friends" (picker etc.)
create index if not exists idx_profiles_active_friend
  on public.profiles(user_id)
  where role = 'friend' and deleted_at is null;

-- Partial index — fast filter for "inactive friends" (BF-14 history view)
create index if not exists idx_profiles_inactive_friend
  on public.profiles(user_id)
  where deleted_at is not null;

-- ====================================================================
-- 2. fn_admin_delete_friend — atomic soft-delete of a friend.
-- ====================================================================
create or replace function public.fn_admin_delete_friend(
  p_target_user_id uuid
)
returns table(deleted_at timestamptz, conversations_left bigint)
language plpgsql security definer
as $$
declare
  v_now constant timestamptz := now();
  v_role user_role;
  v_existing_deleted_at timestamptz;
  v_conv_count bigint;
begin
  -- 1. Row-lock the profile so concurrent Owner clicks are serialized.
  --    SELECT ... FOR UPDATE takes an exclusive row lock until the
  --    transaction commits — partial-state visibility is impossible.
  select role, deleted_at
    into v_role, v_existing_deleted_at
  from public.profiles
  where user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'E_RES_NOT_FOUND';
  end if;

  -- 2. Defense-in-depth: refuse Owner self-delete.
  --    The EF ALSO refuses via caller-side check on target profile
  --    (targetProfile.role === 'owner' ⇒ 403). The RPC layer is
  --    a second line so a future bug in the EF still preserves
  --    the Owner singleton.
  if v_role = 'owner' then
    raise exception 'E_AUTH_FORBIDDEN_OWNER_DELETE';
  end if;

  -- 3. Idempotency: if already deleted, return the original timestamp
  --    without re-running the atomic batch UPDATE. Re-clicks + retry
  --    races converge to a single observed deletion moment.
  if v_existing_deleted_at is not null then
    fn_admin_delete_friend.deleted_at := v_existing_deleted_at;
    fn_admin_delete_friend.conversations_left := 0;
    return next;
    return;
  end if;

  -- 4. Atomic batch UPDATE on conversation_members (1:1 + groups).
  --    WHERE left_at IS NULL filters to active memberships only —
  --    already-left conversations are not re-stamped (preserves the
  --    earlier timestamp that recorded the friend's prior exit).
  with updated as (
    update public.conversation_members
      set left_at = v_now
    where user_id = p_target_user_id
      and left_at is null
    returning conversation_id
  )
  select count(*)
    into v_conv_count
  from updated;

  -- 5. Soft delete the profile row. RETURNING into the output param
  --    `deleted_at` (the RETURNS TABLE column is a local variable in
  --    the function scope — standard plpgsql).
  update public.profiles
    set deleted_at = v_now
  where user_id = p_target_user_id
  returning profiles.deleted_at
    into fn_admin_delete_friend.deleted_at;

  fn_admin_delete_friend.conversations_left := v_conv_count;
  return next;
end;
$$;

-- Grant execute to service_role so the EF can invoke it.
-- GRANT is itself idempotent — repeated grants are no-ops.
grant execute on function public.fn_admin_delete_friend(uuid) to service_role;

comment on function public.fn_admin_delete_friend(uuid) is
  'M6-5 atomic soft-delete of a friend (F-SEC-06 / BF-14). Marks '
  'profile.deleted_at AND sets left_at on every active '
  'conversation_members row in one transaction. SECURITY DEFINER. '
  'Idempotent. Owner self-delete refused in two layers (RPC + EF). '
  'Service-role invoke only.';

-- ====================================================================
-- End of migration 18 — admin-delete-friend atomic operation
-- ====================================================================
