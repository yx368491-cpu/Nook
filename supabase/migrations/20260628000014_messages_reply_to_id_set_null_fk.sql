-- ============================================================================
-- Migration 0014: messages.reply_to_id → ON DELETE SET NULL
-- ============================================================================
-- Purpose:
--   Migration 0001 declared `reply_to_id UUID REFERENCES public.messages(id)`
--   without an `ON DELETE` clause. Postgres defaults to `NO ACTION`, which
--   means any attempt to DELETE a parent message that still has surviving
--   reply children raises a `foreign_key_violation` (SQLSTATE 23503) and
--   aborts the transaction.
--
--   This breaks the v1.0 30-day TTL cron (M3-6 backlog: pg_cron J-01,
--   `DELETE FROM messages WHERE created_at < now() - INTERVAL '30 days'`):
--   once ANY reply chain crosses the 30-day mark, the parent row becomes
--   un-deletable, conversations pile up orphans indefinitely.
--
--   SPEC § 6 BF-07 E1 explicitly designs around this path:
--     "被引用消息已被 TTL 清 → reply_to_id = set NULL（FK 已预设）
--      → 引用卡显示 '(原消息已过期)'"
--
--   R-14 likewise names the R-14 spec as "FK 已预设" — but the original
--   migration 0001 didn't get the SET NULL clause. This migration closes
--   the gap so the TTL cron + the SPEC design intent + the
--   recipient-side hydration (M4-6 listMessages join) are all wire-aligned.
--
-- Side-effects:
--   1. J-01 (30-day TTL hard-delete) can now delete parent messages
--      without first sweeping children; the children's `reply_to_id` is
--      set to NULL by the FK action.
--   2. `listMessages` join returns `reply_to: null` for orphan children,
--      `MessageListItem.replyTo` is null, `<ReplyCard>` does not render
--      for those children — graceful empty bubble behaviour consistent
--      with the existing "deleted by sender" placeholder render path.
--   3. Recipients continue to see the orphan reply's body verbatim (only
--      the `<ReplyCard>` chip on top is suppressed because the parent FK
--      resolved to null).
--
-- Idempotency:
--   The new constraint is named `messages_reply_to_id_fkey_v2` (NOT the
--   default `messages_reply_to_id_fkey`) so that re-runs via `supabase
--   db push --include-all` leave the existing v2 alone instead of dropping
--   & rebuilding. Migration 0001's default-named FK is dropped inside a
--   `do $$ ... $$` exception-safe block to handle the case where v1 has
--   already been applied.
--
-- Security:
--   Definition-only change; no RLS / policy implications.
-- ============================================================================

do $$
begin
  -- Drop the original FK (default NO ACTION). Constraint name follows
  -- Postgres' auto-naming convention for inline FK declarations.
  begin
    alter table public.messages
      drop constraint if exists messages_reply_to_id_fkey;
  exception when undefined_object then
    null; -- already dropped in a previous push
  end;

  -- Re-add with ON DELETE SET NULL. Use a non-default name so re-runs
  -- don't fight with the existing constraint.
  begin
    alter table public.messages
      add constraint messages_reply_to_id_fkey_v2
      foreign key (reply_to_id) references public.messages(id)
      on delete set null
      on update no action;
  exception when duplicate_object then
    null; -- already applied
  end;
end $$;

comment on constraint messages_reply_to_id_fkey_v2 on public.messages is
  'M4-6 follow-up: ON DELETE SET NULL so the 30-day TTL cron (pg_cron J-01) '
  'can hard-delete parent reply messages without FK-violation abort. Closes '
  'the gap that migration 0001 left when the FK was declared without an '
  'ON DELETE clause. Per SPEC § 6 BF-07 E1 + DATA-MODEL R-14.';
