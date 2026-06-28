-- Migration 0016 — REPLICA IDENTITY FULL on public.reactions
--
-- Context (M4-7 followup):
-- The optimistic-update flow for reactions works as follows:
--   1. useRemoveReaction calls applyReactionRemove (count-- on bucket).
--   2. RPC fires; on settled mutate invalidates
--      ['messages', userId, convId] -> listMessages refetch returns
--      canonical state.
--   3. Supabase Realtime channel also dispatches the DELETE row event.
--   4. The client's self-actor gate checks
--      `actorUserId === selfUserId` and skips applying the patch
--      twice. Without `REPLICA IDENTITY FULL`, the DELETE event has
--      `old = {}` (only PK), so `old.user_id` is `undefined` and the
--      `=== selfUserId` check fails -> the patch handler proceeds
--      and decrements a bucket that has ALREADY been decremented by
--      the optimistic patch + invalidate-refetch. Result: brief
--      off-by-one flicker (count goes N-2 instead of canonical N-1)
--      visible until the next refetch.
--
-- Setting REPLICA IDENTITY FULL persists the FULL OLD row in WAL,
-- so Supabase Realtime's DELETE events surface `old: { message_id,
-- user_id, emoji, created_at }` and the self-actor gate can
-- correctly identify the actor.
--
-- This migration is idempotent (FULL is set unconditionally; setting
-- it twice is a no-op).
--
-- Pre-flight:
--   \d public.reactions
--     Replica Identity: FULL       (was: DEFAULT)
--
--   -- smoke test on a live instance:
--   -- open two browser tabs as the SAME user against the same
--   -- conversation. User removes 👍 on tab 1. Tab 2 should see the
--   -- 👍 chip count drop by exactly 1, no off-by-one flicker.
--
-- Reference (Supabase docs):
--   https://supabase.com/docs/guides/realtime/postgres-changes#replication
--
-- MUST run AFTER supabase/migrations/20260628000003_extend_schema_and_enums.sql
-- (which originally created `public.reactions` with REPLICA IDENTITY DEFAULT,
-- Supabase's default for new tables).
--
-- This migration contains TWO DDL statements; both are required for the
-- M4-7 Realtime layer to function end-to-end:
--
--   1. `ALTER TABLE ... REPLICA IDENTITY FULL`
--      Persists the FULL OLD row in WAL so DELETE events surface
--      `old: { message_id, user_id, emoji, created_at }`. Without this,
--      the self-actor gate inside
--      `src/hooks/useConversationRealtime.ts:onReactionEvent` cannot
--      identify self-removes (the OLD row carries only the PK).
--
--   2. `ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions`
--      Supabase does NOT auto-add tables to the realtime publication
--      on creation. Without this, NO row events on `public.reactions`
--      are delivered to subscribed channels — INSERT and DELETE events
--      would never reach the client, making the entire M4-7 RT layer
--      non-functional even though every other piece (hooks, channel
--      subscriptions, optimistic patches) is wired correctly.
--
-- Both statements are idempotent — running this migration twice is a
-- no-op:
--   (1) REPLICA IDENTITY FULL is unconditionally set
--       (`ALTER TABLE` is idempotent for the same target value).
--   (2) The DO block first verifies (a) that the
--       `supabase_realtime` publication exists and (b) that
--       `public.reactions` is not already a member. If publication
--       is missing (e.g. vanilla Postgres without Supabase Realtime
--       init), a NOTICE is logged and the block returns early
--       without raising — the migration never aborts on self-hosted
--       configs. To make RT actually function on such configs, the
--       operator must create the publication manually:
--       `CREATE PUBLICATION supabase_realtime FOR TABLE ...;`

-- (1) Persist full OLD row so DELETE events carry it
ALTER TABLE public.reactions REPLICA IDENTITY FULL;

-- (2) Add `public.reactions` to the Supabase Realtime publication so
-- row events are published to subscribers. Required for the
-- `reactions` view of `subscribeConversationEvents` to receive any
-- rows at all. CRITICAL — without this, ALTER TABLE above is moot.
--
-- Two-layer guard: (a) verify the publication itself exists; (b)
-- verify the table is not already a member. If publication is
-- missing, log a NOTICE with actionable setup info and return early
-- — the migration does NOT abort on self-hosted configs without
-- Supabase Realtime init.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE NOTICE 'publication "supabase_realtime" does not exist; skipping add. Enable Supabase Realtime (Create publication `supabase_realtime` or run `supabase start` with realtime enabled) before deploying for RT to function.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions';
  END IF;
END
$$;
