import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/useAuth';
import { env } from '@/config/env';

export interface FriendSignupInput {
  inviteToken: string;
  email: string;
  password: string;
  displayName: string;
}

export interface FriendSignupResult {
  session: {
    accessToken: string;
    user: { id: string; email?: string };
  };
  conversationId: string | null;
}

interface UseFriendSignupReturn {
  /** Submit the friend signup form */
  signup: (input: FriendSignupInput) => Promise<void>;
  /** Whether the signup request is in progress */
  isLoading: boolean;
  /** Last error message (null when no error) */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
}

/**
 * Hook to call the friend-signup Edge Function (CAP-04).
 *
 * Flow:
 * 1. POST to the friend-signup EF
 * 2. Receive session + conversation_id
 * 3. Set the session in Supabase client
 * 4. Update the auth store
 * 5. Navigate to /home
 */
export function useFriendSignup(): UseFriendSignupReturn {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const setProfile = useAuth((s) => s.setProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = useCallback(async (input: FriendSignupInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine the EF URL
      const functionsUrl = env.supabaseUrl
        ? `${env.supabaseUrl}/functions/v1/friend-signup`
        : 'http://127.0.0.1:54321/functions/v1/friend-signup';

      // POST to the friend-signup Edge Function
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invite_token: input.inviteToken,
          email: input.email,
          password: input.password,
          display_name: input.displayName,
        }),
      });

      const body = await response.json();

      // Handle error responses
      if (!response.ok) {
        const errCode = body?.error?.code as string | undefined;
        const errMsg = body?.error?.message as string | undefined;

        switch (errCode) {
          case 'E_RES_INVITE_EXPIRED':
            throw new Error('auth.inviteExpired');
          case 'E_RES_INVITE_USED':
            throw new Error('auth.inviteUsed');
          case 'E_RES_OWNER_DELETED':
            throw new Error('auth.inviteOwnerDeleted');
          case 'E_RES_CONVERSATION_FULL':
            throw new Error('Conversation is full');
          case 'E_AUTH_EMAIL_EXISTS':
            throw new Error('auth.emailInUse');
          case 'E_VAL_INVALID_FORMAT':
          case 'E_VAL_REQUIRED_FIELD':
            throw new Error(errMsg ?? 'errors.internalError');
          default:
            throw new Error(errMsg ?? 'errors.internalError');
        }
      }

      // Success: extract session and conversation_id
      const { session: efSession, conversation_id: conversationId } = body as {
        session: { access_token: string; refresh_token: string; user: { id: string; email?: string } } | null;
        conversation_id: string | null;
      };

      if (!efSession) {
        // Edge Function created account but couldn't generate session
        // This is a rare edge case; let the user go to login
        setError('Account created. Please log in.');
        return;
      }

      // Set the session in Supabase client (this persists to localStorage)
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: efSession.access_token,
        refresh_token: efSession.refresh_token,
      });

      if (sessionErr) {
        console.error('Failed to set session:', sessionErr);
        setError('errors.internalError');
        return;
      }

      // Update auth store
      setSession({
        accessToken: efSession.access_token,
        user: efSession.user,
      });

      // Set a basic profile (will be enhanced when /home loads)
      setProfile({
        id: efSession.user.id,
        displayName: input.displayName,
        avatarUrl: null,
        role: 'friend',
        language: 'zh-CN',
        lastSeenAt: null,
        createdAt: new Date().toISOString(),
      });

      // Navigate to home
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'errors.internalError';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, setSession, setProfile]);

  const clearError = useCallback(() => setError(null), []);

  return { signup, isLoading, error, clearError };
}
