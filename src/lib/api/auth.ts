import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/api/errors';
import type { AuthResponse, AuthTokenResponse } from '@supabase/supabase-js';

export interface SignUpResult {
  userId: string;
  email: string;
}

export interface SignInResult {
  userId: string;
  email: string;
  role?: string;
}

/**
 * Auth API — thin wrapper over Supabase Auth.
 * All functions return typed results or throw AppError.
 */
export const authApi = {
  /**
   * Register a new user (Owner or Friend).
   * Stores role + display_name in user_metadata for trigger-based profile creation.
   */
  async signUp(
    email: string,
    password: string,
    displayName: string,
    role: 'owner' | 'friend' = 'owner',
  ): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, display_name: displayName },
      },
    });

    if (error) throw mapAuthError(error);
    if (!data.user) throw { code: 'INTERNAL', message: 'Registration failed — no user returned' };

    return { userId: data.user.id, email: data.user.email ?? email };
  },

  /**
   * Sign in with email + password.
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw mapAuthError(error);
    if (!data.user) throw { code: 'INVALID_CREDENTIALS', message: 'No user returned after login' };

    const role = data.user.user_metadata?.role as string | undefined;

    return {
      userId: data.user.id,
      email: data.user.email ?? email,
      role,
    };
  },

  /**
   * Sign out current session.
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw mapAuthError(error);
  },

  /**
   * Restore an existing session on app mount (from localStorage persistence).
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw mapAuthError(error);
    return data.session;
  },

  /**
   * Subscribe to auth state changes (login, logout, token refresh).
   * Returns an unsubscribe function.
   */
  onAuthChange(
    callback: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', userId: string | null) => void,
  ) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          callback(event, session?.user?.id ?? null);
          break;
        case 'SIGNED_OUT':
          callback('SIGNED_OUT', null);
          break;
      }
    });
    return data?.subscription?.unsubscribe ?? (() => {});
  },
};
