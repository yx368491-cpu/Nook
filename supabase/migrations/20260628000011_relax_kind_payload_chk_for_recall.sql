-- ============================================================================
-- M4-4 · Migration 11 · Relax messages_kind_payload_chk for soft-recall
-- ============================================================================
-- Purpose:
--   Allows `body = '__recalled__'` (the M4-4 sentinel) on recalled messages
--   regardless of kind, while keeping ALL normal-state invariants intact.
--   This is the constraint relaxation required by `fn_recall_message`
--   (migration 0010) when recalling image / file messages (which the M3-4
--   schema enforces to have body IS NULL).
--
-- Tradeoff:
--   - More expressive CHECK (= soft recall works across all user-facing
--     kinds: text / image / file). System messages remain immutable per
--     fn_recall_message guard #4 (`kind != 'system'`).
--     Soft recall's whole point is the body becomes inert — leaving the
--     attachment_id pointing at the original file is fine because pg_cron
--     J-01 will HARD-delete the whole message row at 30-day TTL, which
--     cascades the attachments.message_id FK to NULL; J-03 then cleans up
--     the storage object. Recall ≠ TTL change.
--   - The empty `recalled_at IS NULL` condition on the existing branches
--     is still ROW-VALID — a future "live" message with that exact shape
--     would still be rejected, since its recalled_at MUST be NULL.
--
-- Idempotency:
--   The constraint is DROPPED then RE-ADDED inside a DO block that catches
--   `duplicate_object` — safe to re-run via `supabase db push --include-all`.
--
-- Backfill:
--   None. The previous constraint already rejected rows with
--   `kind ∈ {image,file} AND body IS NOT NULL`, so existing rows are
--   either (a) recalling-eligible text (body IS NOT NULL, recalled_at NULL)
--   or (b) image/file (body NULL, attachment_id NOT NULL). No shape that
--   would now violate the relaxed constraint exists in the data.
--
-- Security:
--   Definition-only change; no RLS / policy implications. SECURITY INVOKER
--   RPCs already gate writes (fn_send_text_message, fn_send_image_file,
--   fn_edit_message, fn_recall_message).
-- ============================================================================

do $$
begin
  -- 1. Drop the M3-era strict constraint that forbids body on image/file.
  alter table public.messages drop constraint if exists messages_kind_payload_chk;

  -- 2. Add the relaxed version. The original three branches are preserved
  --    verbatim (each is now ANDed with `recalled_at is null` so a future
  --    row cannot accidentally satisfy a branch in recalled state); a new
  --    4th branch permits the M4-4 sentinel-state rows.
  --
  --    Branch A: normal text message.
  --    Branch B: system message (always body=null, attachment_id=null; never recalled).
  --    Branch C: normal image/file (body=null, attachment_id NOT null).
  --    Branch D: SOFT-RECALLED any USER-FACING kind (text / image / file) — body
  --              is the sentinel and recalled_at is set. System is EXPLICITLY
  --              excluded (kind <> 'system') as defense-in-depth against
  --              service_role bypass — fn_recall_message guard #4 also
  --              enforces this but the CHECK should match the invariant.
  begin
    alter table public.messages
      add constraint messages_kind_payload_chk check (
        (kind = 'text'     and body is not null and attachment_id is null and recalled_at is null)
        or (kind = 'system' and body is null     and attachment_id is null)
        or (kind in ('image','file') and body is null and attachment_id is not null and recalled_at is null)
        or (kind <> 'system' and recalled_at is not null and body = '__recalled__')
      );
  exception when duplicate_object then
    null; -- already applied in an earlier run; leave alone.
  end;
end $$;
