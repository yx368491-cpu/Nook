-- Nook M3-1 · Migration 08 · Dev seed (intentionally empty)
-- Source of truth: docs/02_Architecture/Nook-ARCH-DESIGN-v1.0.md § 13.1
-- ("0-row seed (no demo data)")
--
-- Rationale:
--   • Owner registration happens at runtime through the `admin-bootstrap`
--     Edge Function (CAP-01) — it writes the singleton profiles row
--     (role='owner') inline so the unique partial index is satisfied.
--   • Seeding a fake owner here would conflict with the partial unique
--     index on profiles(role='owner') and require explicit cleanup
--     before local dev can actually sign in.
--   • Friend registration happens exclusively via `friend-signup`
--     Edge Function (CAP-04) after an invite is created by Owner.
--     No back-door INSERT into auth.users from a migration file.
--   • PostgREST / RLS already grants `anon + authenticated` the
--     necessary baseline permissions via M2 init_core_tables.sql;
--     we deliberately do NOT re-grant here.
--
-- This migration exists to:
--   1. Provide an explicit "the suite is complete, no data seeding
--      on purpose" anchor in the migration history.
--   2. Allow easier future bootstrap (e.g., a `seed.ts` script the
--      team can run when needed) without changing the migrations list.

-- Mark schema_version row to confirm full M3-1 suite has been applied.
update public.schema_version
set version   = 'm3.1.0-complete',
    applied_at = now()
where id = 1;

-- No data inserts.
select 'm3.1.0 seed (intentionally empty)' as note;
