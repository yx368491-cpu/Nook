-- ============================================================================
-- M4-4: fn_recall_message — 2-minute soft message recall RPC
-- ============================================================================
-- Purpose:
--   Server-enforced self-recall of any kind≠system message within a
--   2-minute window after creation (SPEC § 6 BF-09 / F-MSG-06).
--
-- Guard contract (all must pass; otherwise raise E_MSG_RECALL_FORBIDDEN:
-- <reason>):
--   1. auth.uid() IS NOT NULL                       — caller must be signed-in
--   2. v_sender = auth.uid()                         — owner-recalls-own
--   3. v_recalled IS NULL                            — single-shot (no
--                                                       double-recall)
--   4. v_kind != 'system'                            — system messages are
--                                                       immutable (created
--                                                       by server, not user)
--   5. now() < v_created + INTERVAL '2 minutes'      — 2-minute window
--   6. v_created <= now()                            — created_at sanity
--
-- Side-effects:
--   - UPDATE messages SET body = '__recalled__', recalled_at = now()
--   - attachment_id is INTACT (image / file recall). The storage cleanup
--     story is unchanged: pg_cron J-01 hard-deletes the row at 30-day TTL,
--     which CASCADES attachments.message_id to NULL via the FK; pg_cron
--     J-03 then removes the storage object. Recall is a sender-visible
--     flag, not a TTL change.
--   - The unconditional `body = '__recalled__'` is safe across all
--     user-facing kinds (text / image / file) thanks to migration 0011
--     which relaxed `messages_kind_payload_chk` with a 4th branch that
--     accepts `(recalled_at IS NOT NULL AND body = '__recalled__')`.
--
-- Returns:
--   JSONB row { id, recalled_at } — supabase-js reads these directly.
--
-- Edit interplay (M4-3 ↔ M4-4):
--   - A message can be edited WITHIN 2 min OR recalled WITHIN 2 min
--     (parallel ops, each has its own guard).
--   - fn_edit_message guard #3 still blocks edit-after-recall
--     (`recalled_at IS NULL` check) so a recalled message is IMMUTABLE.
--
-- Security:
--   - SECURITY INVOKER so RLS + auth check both apply
--   - Sender check inside (sender_id = auth.uid()) since RLS does not
--     enforce "owner-only" update — the RLS policy allows any active
--     member CRUD on messages.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_recall_message(
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
  v_recalled    timestamptz;
  v_kind        text;
  v_recalled_at timestamptz;
BEGIN
  -- Guard #1 — caller is signed-in
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'E_MSG_RECALL_FORBIDDEN: not_authenticated'
      USING ERRCODE = 'P0001';
  END IF;

  -- Load + sanity-check the message (guards #2..#6)
  SELECT sender_id, created_at, recalled_at, kind
    INTO v_sender, v_created, v_recalled, v_kind
    FROM public.messages
   WHERE id = p_msg_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_MSG_RECALL_FORBIDDEN: not_found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_sender <> v_auth THEN
    RAISE EXCEPTION 'E_MSG_RECALL_FORBIDDEN: not_owner'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_recalled IS NOT NULL THEN
    RAISE EXCEPTION 'E_MSG_RECALL_FORBIDDEN: already_recalled'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_kind = 'system' THEN
    RAISE EXCEPTION 'E_MSG_RECALL_FORBIDDEN: bad_kind_system'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #6 — created_at sanity
  IF v_created > now() THEN
    RAISE EXCEPTION 'E_MSG_RECALL_FORBIDDEN: created_in_future'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #5 — 2-minute window (SPEC § 6 BF-09)
  IF v_created + INTERVAL '2 minutes' < now() THEN
    RAISE EXCEPTION 'E_MSG_RECALL_FORBIDDEN: window_expired'
      USING ERRCODE = 'P0001';
  END IF;

  -- Commit — body replaced with sentinel + recalled_at stamped
  v_recalled_at := now();
  UPDATE public.messages
     SET body        = '__recalled__',
         recalled_at = v_recalled_at
   WHERE id = p_msg_id;

  RETURN jsonb_build_object(
    'id',          p_msg_id,
    'recalled_at', to_char(v_recalled_at AT TIME ZONE 'UTC',
                           'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END;
$$;

-- Lock down: only authenticated users can call (caller-side check inside).
REVOKE ALL ON FUNCTION public.fn_recall_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_recall_message(uuid) TO authenticated;

COMMENT ON FUNCTION public.fn_recall_message(uuid) IS
  'M4-4 self-recall of a non-system message within 2-minute window. '
  'Replaces body with __recalled__ sentinel and stamps recalled_at. '
  'Returns JSONB row {id, recalled_at}. '
  'Raises E_MSG_RECALL_FORBIDDEN: <reason> on guard failure.';
