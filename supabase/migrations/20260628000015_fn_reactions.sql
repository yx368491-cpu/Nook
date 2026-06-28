-- ============================================================================
-- M4-7: fn_add_reaction + fn_remove_reaction — 6-emoji reaction toggle RPCs
-- ============================================================================
-- Purpose:
--   Server-enforced per-(message, user, emoji) reaction toggle matching the
--   CAP-15 6-hardcoded emoji whitelist (👍 ❤️ 😂 👀 🔥 🙏).
--
--   - fn_add_reaction: idempotent INSERT ... ON CONFLICT DO NOTHING. A re-click
--     of the same emoji is a no-op success (composite PK keeps it idempotent).
--     Distinct emojis from the same user coexist (Slack/Discord style); a user
--     can express 👍 AND ❤️ on the same message without conflict.
--   - fn_remove_reaction: idempotent DELETE ... WHERE. A re-click DELETE on a
--     missing row is a no-op success (0 rows affected).
--
-- Guard contract (BOTH fns share the same five guards, raising
-- E_REACTION_FORBIDDEN: <reason> on failure):
--   1. auth.uid() IS NOT NULL                       — caller must be signed-in
--   2. message exists                                — target row must be live
--   3. v_kind != 'system'                            — system rows are
--                                                       server-emitted notices
--                                                       and never accept
--                                                       user reactions
--   4. caller is active conversation member          — same-conv invariant
--                                                       (left_at IS NULL)
--   5. emoji ∈ whitelist                             — enforced by CHECK
--                                                       inline AND by a
--                                                       literal allowlist
--                                                       (defense-in-depth)
--
-- Side-effects:
--   - fn_add_reaction:
--       INSERT INTO reactions ON CONFLICT (message_id, user_id, emoji) DO
--       NOTHING. No realtime echo fires on the no-op path (commit-1 inserts
--       only when no existing row).
--   - fn_remove_reaction:
--       DELETE from reactions WHERE matching triple. Postgres DELETE on a
--       non-matching WHERE is a 0-row-affected no-op success.
--
-- Returns:
--   JSONB shape — matches the existing M4-3/4/5/6 RPC contract so the client
--   can `data as { ... }` without further parsing:
--     { message_id, user_id, emoji, created_at?, removed }
--
-- Edit interplay:
--   - reactions are INDEPENDENT of messages.body edits (M4-3), recalls (M4-4),
--     and sender-only soft deletes (M4-5). The reactions CASCADE FK on
--     `messages.id` means a 30-day TTL purge nukes the reactions too; recall
--     simply flips body so reactions stay visible on the recalled bubble.
--
-- Security:
--   - SECURITY INVOKER so RLS + auth check both apply.
--   - RLS already enforces self-only insert/delete on reactions (policies
--     `reactions_insert_self` + `reactions_delete_self`). The RPC + guards
--     here are a SECOND layer mapping raw PG errors to stable client codes
--     (`MessageReactionError.code`).
-- ============================================================================

-- ============================================================================
-- fn_add_reaction
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_add_reaction(
  p_msg_id uuid,
  p_emoji  text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_auth      uuid := auth.uid();
  v_sender    uuid;
  v_conv      uuid;
  v_kind      text;
BEGIN
  -- Guard #1 — caller is signed-in
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: not_authenticated'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #5 — emoji whitelist (defense-in-depth; CHECK inline on table also
  -- blocks invalid emoji but the explicit list makes the RPC self-documenting
  -- and produces a friendlier E_REACTION_FORBIDDEN message instead of a
  -- raw `new row for relation "reactions" violates check constraint`).
  IF p_emoji NOT IN ('👍','❤️','😂','👀','🔥','🙏') THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: bad_emoji_%%', p_emoji
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #2 — message exists; capture sender / conv / kind for guards #3 + #4
  SELECT sender_id, conversation_id, kind
    INTO v_sender, v_conv, v_kind
    FROM public.messages
   WHERE id = p_msg_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: not_found'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #3 — system messages are immutable to user reactions
  IF v_kind = 'system' THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: bad_kind_system'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #4 — caller is an active conversation member
  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
   WHERE cm.conversation_id = v_conv
     AND cm.user_id        = v_auth
     AND cm.left_at        IS NULL
  ) THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: not_member'
      USING ERRCODE = 'P0001';
  END IF;

  -- Idempotent insert: same (msg, user, emoji) twice = no-op success.
  INSERT INTO public.reactions (message_id, user_id, emoji)
  VALUES (p_msg_id, v_auth, p_emoji)
  ON CONFLICT (message_id, user_id, emoji) DO NOTHING;

  RETURN jsonb_build_object(
    'message_id', p_msg_id,
    'user_id',    v_auth,
    'emoji',      p_emoji,
    'removed',    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_add_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_add_reaction(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.fn_add_reaction(uuid, text) IS
  'M4-7 idempotent self reaction-toggle add. '
  'Raises E_REACTION_FORBIDDEN: <reason> on guard failure. '
  'Returns JSONB {message_id, user_id, emoji, removed:false}.';

-- ============================================================================
-- fn_remove_reaction
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_remove_reaction(
  p_msg_id uuid,
  p_emoji  text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_auth        uuid := auth.uid();
  v_sender      uuid;
  v_conv        uuid;
  v_kind        text;
  v_rows_deleted integer;
BEGIN
  -- Guard #1 — caller is signed-in
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: not_authenticated'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard #5 — emoji whitelist (same defense-in-depth as fn_add_reaction)
  IF p_emoji NOT IN ('👍','❤️','😂','👀','🔥','🙏') THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: bad_emoji_%%', p_emoji
      USING ERRCODE = 'P0001';
  END IF;

  -- Guards #2, #3, #4 — load + verify message + caller membership
  SELECT sender_id, conversation_id, kind
    INTO v_sender, v_conv, v_kind
    FROM public.messages
   WHERE id = p_msg_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: not_found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_kind = 'system' THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: bad_kind_system'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
   WHERE cm.conversation_id = v_conv
     AND cm.user_id        = v_auth
     AND cm.left_at        IS NULL
  ) THEN
    RAISE EXCEPTION 'E_REACTION_FORBIDDEN: not_member'
      USING ERRCODE = 'P0001';
  END IF;

  -- Idempotent delete: missing reaction row = 0 rows affected, still success.
  -- (User can re-click DELETE on a not-yet-added emoji without surfacing an
  -- error.)
  DELETE FROM public.reactions
   WHERE message_id = p_msg_id
     AND user_id    = v_auth
     AND emoji      = p_emoji;

  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'message_id',    p_msg_id,
    'user_id',       v_auth,
    'emoji',         p_emoji,
    'removed',       true,
    'rows_affected', v_rows_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_remove_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_remove_reaction(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.fn_remove_reaction(uuid, text) IS
  'M4-7 idempotent self reaction-toggle remove. '
  'Returns JSONB {message_id, user_id, emoji, removed:true, rows_affected}. '
  'Raises E_REACTION_FORBIDDEN: <reason> on guard failure.';
