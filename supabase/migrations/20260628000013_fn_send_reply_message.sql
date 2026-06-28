-- ============================================================================
-- M4-6: fn_send_reply_message — sender-threaded reply RPC
-- ============================================================================
-- Purpose:
--   Server-enforced insert of a reply message that references
--   `messages.reply_to_id` already populated in the schema (migration 0001).
--   The RPC strictly enforces two invariants that standard REST POST /
--   Postgres FK cannot alone enforce:
--
--       R-14  reply_to_id MUST point to a message in the SAME conversation
--             (Postgres FK only guarantees the row exists, not that it
--              belongs to p_conversation_id; a malicious Friend could
--              craft reply_to_id from another conversation visible to
--              them via their own membership and produce a thread that
--              bleeds a target message across conv boundaries).
--
--       R-15  auth.uid() MUST be an ACTIVE member of p_conversation_id
--             (left_at IS NULL). RLS would NOT sufficiently narrow the
--             SELECT because it allows reads of any conversation the
--             sender is a member of; this is a write-side check that
--             strengthens the membership invariant.
--
-- Guard contract (all must pass; otherwise raise E_MSG_REPLY_FORBIDDEN:
-- <reason>):
--   1. NOT_AUTHENTICATED          — auth.uid() IS NULL
--   2. REPLY_TARGET_NOT_FOUND     — target row missing (prevents F.K.
--                                    probe via. permission errors)
--   3. REPLY_TARGET_WRONG_CONV    — target.conversation_id != p_conv
--                                    (R-14 violation)
--   4. SENDER_NOT_MEMBER          — auth.uid() not in active
--                                    conversation_members of p_conv
--                                    (R-15 enforcement)
--   5. BAD_KIND_SYSTEM            — target.kind = 'system' (system rows
--                                    are server-emitted notices, not
--                                    user-discussion targets; replies to
--                                    them are noise, not signal)
--
-- Guard checks 2 + 3 run BEFORE 4: this matches fn_recall_message's
-- "load + sanity-check before permissions" ordering. Firing
-- SENDER_NOT_MEMBER first would leak conversation membership to
-- non-members (a Friend could probe whether they're a member of conv
-- X by attempting to reply to a target with reply_to_id that lives
-- in conv X). Firing REPLY_TARGET_NOT_FOUND first instead bounds
-- the information surface to "row exists or not".
--
-- Idempotency:
--   The caller's `p_client_msg_id` is the dedupe key (UNIQUE constraint
--   on messages.client_msg_id from migration 0001). A duplicate POST
--   resumes the canonical row in line with how regular REST inserts
--   behave.
--
-- Returns:
--   JSONB row { id, conversation_id, reply_to_id, created_at } — the
--   canonical hydrate facts without a follow-up SELECT round-trip.
--
-- Security:
--   - SECURITY INVOKER so RLS + auth check both apply.
--   - Member-side RLS is the only auth in standard REST; this RPC adds
--     the explicit sender-active-member check + same-conversation
--     invariant.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_send_reply_message(
  p_conv          uuid,
  p_reply_to_id   uuid,
  p_body          text,
  p_client_msg_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_auth          uuid := auth.uid();
  v_target_conv   uuid;
  v_target_kind   text;
  v_target_recall timestamptz;
  v_target_delete timestamptz;
  v_member_count  int;
  v_new           text;
  v_new_id        uuid;
  v_created_at    timestamptz;
BEGIN
  -- Guard #1 — caller is signed-in
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'E_MSG_REPLY_FORBIDDEN: not_authenticated'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #2 — target row exists (load early so subsequent type checks
  -- operate on a valid NOT NULL row)
  SELECT conversation_id, kind, recalled_at, deleted_by_sender_at
    INTO v_target_conv, v_target_kind, v_target_recall, v_target_delete
    FROM public.messages
   WHERE id = p_reply_to_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_MSG_REPLY_FORBIDDEN: reply_target_not_found'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #3 — target row is in the same conversation (R-14)
  IF v_target_conv <> p_conv THEN
    RAISE EXCEPTION 'E_MSG_REPLY_FORBIDDEN: reply_target_wrong_conversation'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #4 — sender is an ACTIVE member of the conversation (R-15).
  -- We do this AFTER guards 2 + 3 so the order leaks no membership
  -- information to a non-member attempting reply_to_id probes. RLS
  -- would already block the writes, but the explicit check gives a
  -- stable `E_MSG_REPLY_FORBIDDEN: sender_not_member` error code
  -- that the client mapping can branch on.
  SELECT count(*)
    INTO v_member_count
    FROM public.conversation_members
   WHERE conversation_id = p_conv
     AND user_id        = v_auth
     AND left_at        IS NULL;

  IF v_member_count = 0 THEN
    RAISE EXCEPTION 'E_MSG_REPLY_FORBIDDEN: sender_not_member'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #5 — target is NOT a system message (system rows are
  -- server-emitted notices like "Alice joined the chat"; they're
  -- not conversation targets and replying to them creates noise).
  -- We deliberately allow replying TO a recalled or sender-deleted
  -- target: a thread's reply chain is a conversation user-perceived
  -- artifact, not a piece of canonical content — the ReplyCard
  -- preview chip will already render the target as muted
  -- "(recalled)" or "(deleted)" if needed (handled client-side).
  IF v_target_kind = 'system' THEN
    RAISE EXCEPTION 'E_MSG_REPLY_FORBIDDEN: bad_kind_system'
      USING ERRCODE = 'P0001';
  END IF;

  -- Body length check (mirror messages.kind_payload_chk branch A:
  -- kind='text' requires body NOT NULL + length 1..4000)
  v_new := btrim(coalesce(p_body, ''));
  IF char_length(v_new) < 1 OR char_length(v_new) > 4000 THEN
    RAISE EXCEPTION 'E_MSG_REPLY_FORBIDDEN: bad_length_%', char_length(v_new)
      USING ERRCODE = 'P0001';
  END IF;

  -- Insert the reply row. Idempotency on (p_client_msg_id) is enforced
  -- by the messages.client_msg_id UNIQUE constraint; on a duplicate
  -- Postgres raises 23505 which we let propagate to the client (the
  -- httprpc error surfaces as PostgrestError.code '23505' to the
  -- React Query mutation; the pending optimistic bubble's server id
  -- will eventually be resolved by a Realtime INSERT echo).
  v_created_at := now();
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    kind,
    body,
    reply_to_id,
    client_msg_id,
    created_at
  )
  VALUES (
    p_conv,
    v_auth,
    'text',
    v_new,
    p_reply_to_id,
    p_client_msg_id,
    v_created_at
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'id',              v_new_id,
    'conversation_id', p_conv,
    'reply_to_id',     p_reply_to_id,
    'created_at',      to_char(v_created_at AT TIME ZONE 'UTC',
                               'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END;
$$;

-- Lock down: only authenticated users can call (sender check inside).
REVOKE ALL ON FUNCTION public.fn_send_reply_message(uuid, uuid, text, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_send_reply_message(uuid, uuid, text, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.fn_send_reply_message(uuid, uuid, text, uuid) IS
  'M4-6 sender-threaded reply within the same conversation. '
  'Enforces R-14 (reply target must share p_conv) + R-15 (sender must be '
  'active member) + system-row immutability. '
  'Returns JSONB row {id, conversation_id, reply_to_id, created_at}. '
  'Raises E_MSG_REPLY_FORBIDDEN: <reason> on guard failure.';
