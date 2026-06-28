-- Nook M2-4: Invite validation RPC + RLS policy
-- Based on Nook-DATA-MODEL.md v1.0.1

-- 1. RPC: fn_get_invite_details
-- Security definer: runs as the table owner (bypasses RLS), safe for anon calls
-- Returns minimal Owner info + invite status for the invitation landing page
CREATE OR REPLACE FUNCTION public.fn_get_invite_details(invite_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  invite_record RECORD;
  owner_profile RECORD;
BEGIN
  -- Look up the invite
  SELECT i.* INTO invite_record
  FROM public.invites i
  WHERE i.token = invite_token;

  -- If no invite found
  IF invite_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'not_found'
    );
  END IF;

  -- Check if expired
  IF invite_record.expires_at < now() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'expired',
      'expires_at', invite_record.expires_at
    );
  END IF;

  -- Check if already used
  IF invite_record.used_at IS NOT NULL OR invite_record.used_by IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'used',
      'used_at', invite_record.used_at
    );
  END IF;

  -- Check if the inviting owner still exists
  SELECT p.* INTO owner_profile
  FROM public.profiles p
  WHERE p.user_id = invite_record.created_by;

  IF owner_profile.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'owner_deleted'
    );
  END IF;

  -- All checks passed — return owner info
  RETURN jsonb_build_object(
    'valid', true,
    'owner_id', owner_profile.user_id,
    'owner_display_name', owner_profile.display_name,
    'owner_avatar_url', owner_profile.avatar_url,
    'target_kind', invite_record.target_kind,
    'target_conversation_id', invite_record.target_conversation_id,
    'expires_at', invite_record.expires_at
  );
END;
$$;

-- 2. Grant execute on the RPC to anon (so unauthenticated users can validate invites)
GRANT EXECUTE ON FUNCTION public.fn_get_invite_details(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_invite_details(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_invite_details(TEXT) TO service_role;

COMMENT ON FUNCTION public.fn_get_invite_details IS 'Validates an invite token and returns owner info for the invitation landing page. Security definer — safe for anon calls.';
