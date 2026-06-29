-- Migration 0017 — Admin-reset-password schema (invites-augmented)
-- Source of truth: docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 6.1 (admin surfaces)
-- + F-SEC-04 (Owner-only admin actions) + CAP-03.
--
-- Design decision (M6-4 thinker): REUSE `public.invites` for reset tokens.
--   - Token entropy (192-bit base64url) is identical between invites and resets
--   - Lifecycle (expires_at, used_at, revoked_at, created_by) is identical
--   - The NEEDED distinction between invite and reset is the FK target:
--     invites → conversations (target_conversation_id), resets → users
--     (new nullable column target_user_id).
--   - A new `target_kind = 'password_reset'` discriminates the row semantics
--     without inventing a parallel table + parallel RLS + parallel EF.
--
-- Idempotent: drop CHECK is IF EXISTS; new CHECK add wraps in DO-block
-- (handles duplicate_object); column add uses IF NOT EXISTS; index uses
-- IF NOT EXISTS. Re-running this migration is a no-op.
--
-- ⚠️ RLS (migration 0004) already covers admin-side surface:
--   - invites_read_owner / invites_insert_owner / invites_update_owner
--     all gate on `created_by = auth.uid()`.
--   - Password-reset rows follow the same pattern (created_by = Owner).
-- The friend-side completion EF (`complete-password-reset`) ships in
-- M6-4.1 and will use service_role — no client-side RLS for tokens needed.

-- ====================================================================
-- 1. Extend the invites target_kind CHECK
-- ====================================================================
alter table public.invites
  drop constraint if exists invites_target_kind_check;

do $$
begin
  begin
    alter table public.invites
      add constraint invites_target_kind_check
      check (target_kind in ('any','conversation','password_reset'));
  exception when duplicate_object then
    -- Already applied in an earlier run — leave alone.
    null;
  end;
end $$;

-- ====================================================================
-- 2. Add nullable target_user_id FK (UUID pointing at auth.users)
--    Nullable so invite rows (target_kind = 'any' or 'conversation') don't
--    need to set it. password_reset rows MUST set it.
-- ====================================================================
alter table public.invites
  add column if not exists target_user_id uuid references auth.users(id);

-- ====================================================================
-- 3. Partial index — fast lookup of password_resets by target user.
--    The size is bounded (≤ MAX_FRIENDS concurrent pending resets)
--    so the partial WHERE keeps the index small and focused.
-- ====================================================================
create index if not exists idx_invites_password_reset_target_user
  on public.invites(target_user_id)
  where target_kind = 'password_reset';

-- ====================================================================
-- 3b. Partial UNIQUE index — at most ONE pending reset per friend at
--     any time. Defends against the Owner spamming reset tokens via
--     rapid duplicate clicks while a prior reset is still pending,
--     and gives M6-4.1 a trivial "find pending reset for this user"
--     lookup (no DISTINCT-by-target_user_id gymnastics).
--     `used_at IS NULL AND revoked_at IS NULL` covers both
--     consume paths: friend signed in (used_at set) + Owner revoked
--     (revoked_at set). Idempotent: IF NOT EXISTS is a no-op on
--     re-run, and a 23505 error on duplicate inserts is exactly
--     what we want — the EF reads `{ code: 'E_RES_CONFLICT', ... }`
--     via mapAdminError and the UI surfaces "Friend already has a
--     pending reset" via the i18n layer.
-- ====================================================================
create unique index if not exists idx_invites_password_reset_target_user_pending_unique
  on public.invites(target_user_id)
  where target_kind = 'password_reset'
    and used_at is null
    and revoked_at is null;

-- ====================================================================
-- 4. Defense-in-depth: insert-time invariant CHECK that target_user_id
--    is present iff target_kind = 'password_reset'. Adds clarity for
--    future migration authors + EF authors.
-- ====================================================================
do $$
begin
  begin
    alter table public.invites
      add constraint invites_target_user_consistency_chk
      check (
        (target_kind = 'password_reset' and target_user_id is not null)
        or (target_kind <> 'password_reset' and target_user_id is null)
      );
  exception when duplicate_object then
    null;
  end;
end $$;

-- ====================================================================
-- End of migration 17 — invites extended for password-reset tokens
-- ====================================================================
