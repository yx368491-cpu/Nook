import { create } from 'zustand';
import type { Profile } from '@/shared/types/domain';
import { authApi } from '@/lib/api/auth';
import * as profileApi from '@/lib/api/profile';
import { supabase } from '@/lib/supabase';

interface AuthState {
  /** Current Supabase session */
  session: { accessToken: string; user: { id: string; email?: string } } | null;
  /** Current user's profile (fetched from DB) */
  profile: Profile | null;
  /** Whether the auth initialization has completed (on app mount) */
  isInitialized: boolean;
  /** Whether an auth operation is in progress */
  isLoading: boolean;
  /** Last auth-related error message (for UI display) */
  error: string | null;
  /** Whether an avatar upload/delete is in progress (M5-6) */
  isUploadingAvatar: boolean;

  // Actions
  setSession: (session: AuthState['session']) => void;
  setProfile: (profile: Profile | null) => void;
  setInitialized: (val: boolean) => void;
  clear: () => void;

  /** Attempt to restore a persisted session on app mount */
  initialize: () => Promise<void>;
  /** Register a new Owner account */
  register: (email: string, password: string, displayName: string) => Promise<void>;
  /** Sign in with email + password */
  login: (email: string, password: string) => Promise<void>;
  /** Sign out and clear state */
  logout: () => Promise<void>;

  /**
   * M5-6 / F-AUTH-09: upload self avatar.
   * Writes to `avatars/<uid>/avatar-<ts>.<ext>` then PATCHes
   * `profiles.avatar_url`; updates local `profile.avatarUrl` reactively.
   */
  uploadAvatar: (file: File) => Promise<void>;
  /**
   * M5-6 / F-AUTH-09: delete self avatar.
   * PATCH `profiles.avatar_url = null` FIRST (so Avatar consumers fall back
   * to initials immediately), then best-effort storage purge.
   */
  deleteAvatar: () => Promise<void>;
  /**
   * M5-6 / F-AUTH-09: update self profile fields.
   * Accepts camelCase keys (`displayName`) and translates to DB columns.
   */
  updateProfile: (updates: { displayName?: string }) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  isUploadingAvatar: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (val) => set({ isInitialized: val }),
  clear: () => set({ session: null, profile: null, error: null }),

  initialize: async () => {
    try {
      const session = await authApi.getSession();
      if (session?.user) {
        set({
          session: {
            accessToken: session.access_token,
            user: { id: session.user.id, email: session.user.email },
          },
        });

        // Attempt to fetch profile from DB (profiles table may exist or not)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            set({
              profile: {
                id: profile.id,
                displayName: profile.display_name ?? session.user.user_metadata?.display_name ?? '',
                avatarUrl: profile.avatar_url,
                role: profile.role ?? session.user.user_metadata?.role ?? 'friend',
                language: profile.language ?? 'zh-CN',
                lastSeenAt: profile.last_seen_at ?? null,
                createdAt: profile.created_at,
              },
            });
          } else {
            // No profiles table yet (M3+ migration) — use user_metadata
            const meta = session.user.user_metadata;
            set({
              profile: {
                id: session.user.id,
                displayName: (meta?.display_name as string) ?? '',
                avatarUrl: null,
                role: (meta?.role as 'owner' | 'friend') ?? 'friend',
                language: 'zh-CN',
                lastSeenAt: null,
                createdAt: session.user.created_at,
              },
            });
          }
        } catch {
          // profiles table may not exist yet (before migrations)
          const meta = session.user.user_metadata;
          set({
            profile: {
              id: session.user.id,
              displayName: (meta?.display_name as string) ?? '',
              avatarUrl: null,
              role: (meta?.role as 'owner' | 'friend') ?? 'friend',
              language: 'zh-CN',
              lastSeenAt: null,
              createdAt: session.user.created_at,
            },
          });
        }
      }
    } catch {
      // No valid session — user is not logged in
    } finally {
      set({ isInitialized: true });
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.signUp(email, password, displayName, 'owner');

      // After signUp, try to get the session
      // Note: If Supabase has email confirmation enabled, session may be null.
      // Configure Supabase Auth → Settings → Confirm email = OFF for auto-session.
      const session = (await authApi.getSession());

      if (!session) {
        throw { code: 'SESSION_MISSING', message: 'Sign up succeeded but no session returned. Please check Supabase Auth email confirmation settings.' };
      }
      if (session?.user) {
        set({
          session: {
            accessToken: session.access_token,
            user: { id: session.user.id, email: session.user.email },
          },
        });

        // Try to upsert the profile (profiles table may exist or not before M3 migrations)
        try {
          await supabase.from('profiles').upsert({
            id: session.user.id,
            display_name: displayName,
            role: 'owner',
          }, { onConflict: 'id' });
        } catch {
          // Table may not exist yet — profile will be created when migrations run
        }

        set({
          profile: {
            id: session.user.id,
            displayName,
            avatarUrl: null,
            role: 'owner',
            language: 'zh-CN',
            lastSeenAt: null,
            createdAt: session.user.created_at,
          },
        });
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Registration failed';
      set({ error: msg, isInitialized: true });
      // Re-throw so the page's try/catch can also handle it
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.signIn(email, password);

      const session = (await authApi.getSession());
      if (session?.user) {
        set({
          session: {
            accessToken: session.access_token,
            user: { id: session.user.id, email: session.user.email },
          },
          profile: {
            id: session.user.id,
            displayName: session.user.user_metadata?.display_name as string ?? '',
            avatarUrl: null,
            role: (result.role as 'owner' | 'friend') ?? 'friend',
            language: 'zh-CN',
            lastSeenAt: null,
            createdAt: session.user.created_at,
          },
        });
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Login failed';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.signOut();
    } catch {
      // Even if the API call fails, clear local state
    } finally {
      set({ session: null, profile: null, error: null });
    }
  },

  // ============================================================
  // M5-6 / F-AUTH-09 / AC.13 — avatar + profile update actions
  // ============================================================

  uploadAvatar: async (file: File) => {
    const userId = get().session?.user.id ?? get().profile?.id;
    if (!userId) {
      set({ error: 'Not authenticated' });
      const err = { code: 'unauthorized' as const, message: 'Not authenticated' };
      throw err;
    }
    set({ isUploadingAvatar: true, error: null });
    try {
      const publicUrl = await profileApi.uploadAvatar(userId, file);
      const current = get().profile;
      if (current) {
        set({ profile: { ...current, avatarUrl: publicUrl } });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to upload avatar';
      set({ error: msg });
      throw err;
    } finally {
      set({ isUploadingAvatar: false });
    }
  },

  deleteAvatar: async () => {
    const userId = get().session?.user.id ?? get().profile?.id;
    if (!userId) {
      set({ error: 'Not authenticated' });
      const err = { code: 'unauthorized' as const, message: 'Not authenticated' };
      throw err;
    }
    set({ isUploadingAvatar: true, error: null });
    try {
      await profileApi.deleteAvatar(userId);
      const current = get().profile;
      if (current) {
        set({ profile: { ...current, avatarUrl: null } });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to delete avatar';
      set({ error: msg });
      throw err;
    } finally {
      set({ isUploadingAvatar: false });
    }
  },

  updateProfile: async (updates: { displayName?: string }) => {
    const userId = get().session?.user.id ?? get().profile?.id;
    if (!userId) {
      set({ error: 'Not authenticated' });
      const err = { code: 'unauthorized' as const, message: 'Not authenticated' };
      throw err;
    }
    set({ isLoading: true, error: null });
    try {
      // Translate camelCase → snake_case DB columns.
      const patch: profileApi.ProfilePatch = {};
      if (updates.displayName !== undefined) patch.display_name = updates.displayName;
      const result = await profileApi.updateProfile(userId, patch);
      const current = get().profile;
      if (current) {
        set({
          profile: {
            ...current,
            displayName: result.display_name ?? current.displayName,
            avatarUrl: result.avatar_url,
          },
        });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to update profile';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },
}));
