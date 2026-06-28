-- ============================================================================
-- M4-5: fn_delete_own_message — 2-minute sender-only soft delete RPC
-- ============================================================================
-- Purpose:
--   Server-enforced self-delete (column-level soft hide) of any non-system
--   message within a 2-minute window. Unlike recall (which replaces body
--   for every party), delete is sender-exclusive: `deleted_by_sender_at`
--   is set per F-MSG-07 and recipients continue to see the original body
--   unchanged.
--
-- Guard contract (all must pass; otherwise raise E_MSG_DELETE_FORBIDDEN:
-- <reason>):
--   1. auth.uid() IS NOT NULL                       — caller must be signed-in
--   2. v_sender = auth.uid()                         — owner-only (sender-self)
--   3. v_deleted IS NULL                            — single-shot (no
--                                                       double-delete)
--   4. v_kind != 'system'                            — system messages are
--                                                       server-created,
--                                                       immutable
--   5. now() < v_created + INTERVAL '2 minutes'      — 2-minute window
--   6. v_created <= now()                            — created_at sanity
--
-- Side-effects:
--   - UPDATE messages SET deleted_by_sender_at = now()
--   - body / attachment_id / recalled_at / edited_at are INTACT
--   - Attachment storage_object is also INTACT: pg_cron J-01 hard-deletes
--     the row at 30-day TTL → cascades attachments.message_id to NULL →
--     J-03 then removes the storage object.
--
-- Differences vs fn_recall_message (M4-4):
--   - Recall: body = '__recalled__' + recalled_at = now() (global hide for
--     all viewers)
--   - Delete: deleted_by_sender_at = now() (sender-only hide, recipients see
--     the original body)
--   - Recall has no extra exclusion: delete-after-recall is allowed for
--     symmetry, but the render order in MessageItem.tsx makes the global
--     "recalled" placeholder win visually.
--
-- Edit interplay (M4-3 ↔ M4-5):
--   - fn_edit_message guard #3 (via deleted_by_sender_at IS NULL) blocks
--     edit-after-delete so a sender can't edit a message they've hidden.
--   - A deleted message can still be recalled (recall wins visually).
--
-- Returns:
--   JSONB row { id, deleted_at } — supabase-js reads these directly.
--
-- Security:
--   - SECURITY INVOKER so RLS + auth check both apply.
--   - Sender check inside (sender_id = auth.uid()) since RLS does not
--     enforce "owner-only" update — RLS allows any active member CRUD on
--     messages.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_delete_own_message(
  p_msg_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_auth        uuid := auth.uid();
  v_sender      uuid;
  v_created     timestamptz;
  v_deleted     timestamptz;
  v_kind        text;
  v_deleted_at  timestamptz;
BEGIN
  -- Guard #1 — caller is signed-in
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'E_MSG_DELETE_FORBIDDEN: not_authenticated'
      USING ERRCODE = 'P0001';
  END IF;

  -- Load + sanity-check the message (guards #2..#6)
  SELECT sender_id, created_at, deleted_by_sender_at, kind
    INTO v_sender, v_created, v_deleted, v_kind
    FROM public.messages
   WHERE id = p_msg_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_MSG_DELETE_FORBIDDEN: not_found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_sender <> v_auth THEN
    RAISE EXCEPTION 'E_MSG_DELETE_FORBIDDEN: not_owner'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'E_MSG_DELETE_FORBIDDEN: already_deleted'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_kind = 'system' THEN
    RAISE EXCEPTION 'E_MSG_DELETE_FORBIDDEN: bad_kind_system'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #6 — created_at sanity
  IF v_created > now() THEN
    RAISE EXCEPTION 'E_MSG_DELETE_FORBIDDEN: created_in_future'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #5 — 2-minute window (SPEC § 6)
  IF v_created + INTERVAL '2 minutes' < now() THEN
    RAISE EXCEPTION 'E_MSG_DELETE_FORBIDDEN: window_expired'
      USING ERRCODE = 'P0001';
  END IF;

  -- Commit — only `deleted_by_sender_at` is touched; body + attachment_id
  -- preserved (recipient view unchanged per F-MSG-07).
  v_deleted_at := now();
  UPDATE public.messages
     SET deleted_by_sender_at = v_deleted_at
   WHERE id = p_msg_id;

  RETURN jsonb_build_object(
    'id',         p_msg_id,
    'deleted_at', to_char(v_deleted_at AT TIME ZONE 'UTC',
                          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END;
$$;

-- Lock down: only authenticated users can call (sender-check inside).
REVOKE ALL ON FUNCTION public.fn_delete_own_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_delete_own_message(uuid) TO authenticated;

COMMENT ON FUNCTION public.fn_delete_own_message(uuid) IS
  'M4-5 sender-only soft delete within 2-minute window. '
  'Sets deleted_by_sender_at; body + attachment_id preserved '
  '(recipient view unchanged per F-MSG-07). '
  'Returns JSONB row {id, deleted_at}. '
  'Raises E_MSG_DELETE_FORBIDDEN: <reason> on guard failure.';
