-- ============================================================================
-- M4-3: fn_edit_message — 2-minute edit window RPC
-- ============================================================================
-- Purpose:
--   Server-enforced single-shot message edit within a 2-minute window after
--   creation (SPEC § 6 BF-08 / F-MSG-06).
--
-- Guard contract (all must pass; otherwise raise E_MSG_EDIT_FORBIDDEN:
-- <reason>):
--   1. auth.uid() IS NOT NULL                       — caller must be signed-in
--   2. v_sender = auth.uid()                         — owners-edit-own
--   3. v_recalled IS NULL                            — recalled messages are
--                                                       immutable thereafter
--   4. v_edited IS NULL                              — single-shot (one edit
--                                                       per message ever)
--   5. v_kind = 'text'                               — image/file are
--                                                       content-addressable by
--                                                       storage_path/MIME and
--                                                       remain immutable per
--                                                       kind_payload_chk
--   6. now() - v_created >= 0                        — created_at sanity
--   7. now() < v_created + INTERVAL '2 minutes'      — window still open
--   8. v_new != OLD.body                             — no-op guard (avoid
--                                                       bumping updated_at +
--                                                       sending a Realtime echo
--                                                       for nothing)
--   9. char_length(v_new) BETWEEN 1 AND 4000         — body length check
--                                                       matches messages.kind_payload_chk
--
-- Returns:
--   JSONB row { id, body, edited_at } so supabase-js can read fields without
--   a follow-up SELECT (round-trip = 1 RPC).
--
-- Side-effects:
--   - UPDATE messages SET body = v_new, edited_at = now() WHERE id = v_id
--   - The messages.updated_at trigger (migration 0008) bumps updated_at to
--     now() automatically — fine, since updated_at is just an mtime.
--
-- Security:
--   - SECURITY INVOKER so RLS / auth check both apply
--   - RLS on messages (member-only SELECT) naturally limits visibility
--   - We additionally verify sender_id = auth.uid() so only the author can edit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_edit_message(
  p_msg_id  uuid,
  p_new_body text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_auth       uuid := auth.uid();
  v_sender     uuid;
  v_created    timestamptz;
  v_edited     timestamptz;
  v_recalled   timestamptz;
  v_kind       text;
  v_old_body   text;
  v_new        text;
  v_edited_at  timestamptz;
BEGIN
  -- Guard #1 — caller is signed-in
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: not_authenticated'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #2..#5 — load + sanity-check the message
  SELECT sender_id, created_at, edited_at, recalled_at, kind, body
    INTO v_sender, v_created, v_edited, v_recalled, v_kind, v_old_body
    FROM public.messages
   WHERE id = p_msg_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: not_found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_sender <> v_auth THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: not_owner'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_recalled IS NOT NULL THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: already_recalled'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_edited IS NOT NULL THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: already_edited'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_kind <> 'text' THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: bad_kind_%%', v_kind
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #9 — body length
  v_new := btrim(coalesce(p_new_body, ''));
  IF char_length(v_new) < 1 OR char_length(v_new) > 4000 THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: bad_length_%%', char_length(v_new)
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #6 — created_at sanity (defensive — should always be < now())
  IF v_created > now() THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: created_in_future'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #7 — 2-minute window (SPEC § 6 BF-08)
  IF v_created + INTERVAL '2 minutes' < now() THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: window_expired'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #8 — no-op guard
  IF v_new = btrim(coalesce(v_old_body, '')) THEN
    RAISE EXCEPTION 'E_MSG_EDIT_FORBIDDEN: no_change'
      USING ERRCODE = 'P0001';
  END IF;

  -- Commit
  v_edited_at := now();
  UPDATE public.messages
     SET body      = v_new,
         edited_at = v_edited_at
   WHERE id = p_msg_id;

  RETURN jsonb_build_object(
    'id',        p_msg_id,
    'body',      v_new,
    'edited_at', to_char(v_edited_at AT TIME ZONE 'UTC',
                         'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END;
$$;

-- Lock down: only authenticated users can call (caller-side check inside).
REVOKE ALL ON FUNCTION public.fn_edit_message(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_edit_message(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.fn_edit_message(uuid, text) IS
  'M4-3 self-edit text message body within 2-minute window. '
  'Raises E_MSG_EDIT_FORBIDDEN: <reason> on guard failure. '
  'Returns JSONB row {id, body, edited_at}.';
