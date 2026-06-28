import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface InviteDetails {
  ownerId: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  targetKind: 'any' | 'conversation';
  targetConversationId: string | null;
  expiresAt: string;
}

export type InviteErrorReason = 'not_found' | 'expired' | 'used' | 'owner_deleted';

export interface InviteValidationResult {
  /** Loading state */
  isLoading: boolean;
  /** Whether the invite is valid */
  isValid: boolean;
  /** Invite + Owner details (only when valid) */
  details: InviteDetails | null;
  /** Error reason (only when not valid) */
  reason: InviteErrorReason | null;
  /** Raw error message */
  error: string | null;
}

/**
 * Validates an invite token by calling the fn_get_invite_details RPC.
 * This RPC is security definer so it can be called by anonymous users.
 */
export function useInviteValidation(token: string | undefined): InviteValidationResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [reason, setReason] = useState<InviteErrorReason | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setIsValid(false);
      setReason('not_found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('fn_get_invite_details', {
        invite_token: token,
      });

      if (rpcError) {
        console.error('Invite validation RPC error:', rpcError);
        setError(rpcError.message);
        setIsValid(false);
        setReason('not_found');
        return;
      }

      const result = data as Record<string, unknown>;

      if (!result?.valid) {
        setIsValid(false);
        setReason((result?.reason as InviteErrorReason) ?? 'not_found');
        return;
      }

      setIsValid(true);
      setDetails({
        ownerId: result.owner_id as string,
        ownerDisplayName: result.owner_display_name as string,
        ownerAvatarUrl: (result.owner_avatar_url as string | null) ?? null,
        targetKind: (result.target_kind as 'any' | 'conversation') ?? 'any',
        targetConversationId: (result.target_conversation_id as string | null) ?? null,
        expiresAt: result.expires_at as string,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown validation error';
      console.error('Invite validation error:', msg);
      setError(msg);
      setIsValid(false);
      setReason('not_found');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validate();
  }, [validate]);

  return { isLoading, isValid, details, reason, error };
}
