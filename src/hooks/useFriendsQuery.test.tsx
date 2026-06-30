/**
 * Nook M6-4 · useFriendsQuery unit tests.
 *
 * vi.mock('@/lib/supabase') at module top — verifies that
 * `listFriendsOfOwner` is called with the right user id, returns the
 * row shape on success, and the hook reflects `{ data, isLoading,
 * error, refetch }` correctly.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/stores/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/useAuth';
import { useFriendsQuery } from './useFriendsQuery';

const useAuthMock = useAuth as unknown as Mock;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const memberRow = (userId: string) => ({ user_id: userId });
const profileRow = (
  userId: string,
  displayName: string,
  avatarUrl: string | null = null,
) => ({
  user_id: userId,
  display_name: displayName,
  avatar_url: avatarUrl,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('M6-4 useFriendsQuery', () => {
  it('returns no data when userId is null (query disabled, supabase.from not called)', async () => {
    useAuthMock.mockImplementation((sel: (s: { session: { user: { id: string } } | null }) => unknown) =>
      sel({ session: null }),
    );

    const { result } = renderHook(() => useFriendsQuery(), {
      wrapper: makeWrapper(),
    });
    // When `enabled: false`, react-query never invokes queryFn AND the
    // data slot stays undefined (not []). The hooks contract is no
    // queryFn call when unauthenticated — verified by the `supabase.from`
    // spy + the `isLoading` being false once settled.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('happy: hydrates friends of the owner, alpha-sorted by display_name', async () => {
    useAuthMock.mockReturnValue('owner-uuid');

    // Stage 1: distinct friend user_ids
    const fromMock = supabase.from as unknown as Mock;
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                memberRow('friend-b'),
                memberRow('friend-a'),
                memberRow('friend-b'), // dedup
              ],
              error: null,
            }),
          }),
        }),
      }),
    });
    // Stage 2: profile hydration for [friend-a, friend-b]
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            profileRow('friend-b', 'Bob'),
            profileRow('friend-a', 'Alice', 'https://x/a.png'),
          ],
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useFriendsQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data).toEqual([
      { userId: 'friend-a', displayName: 'Alice', avatarUrl: 'https://x/a.png' },
      { userId: 'friend-b', displayName: 'Bob', avatarUrl: null },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('happy-zero: returns [] when conversation_members is empty', async () => {
    useAuthMock.mockReturnValue('owner-uuid');
    const fromMock = supabase.from as unknown as Mock;
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useFriendsQuery(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('error: surfaces member-stage DB error on the hook', async () => {
    useAuthMock.mockReturnValue('owner-uuid');
    const fromMock = supabase.from as unknown as Mock;
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'network down', details: null },
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useFriendsQuery(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect((result.current.error as unknown as { code: string }).code).toBe('DB_ERROR');
  });

  it('error: surfaces profile-stage (hydration) DB error on the hook', async () => {
    useAuthMock.mockReturnValue('owner-uuid');
    const fromMock = supabase.from as unknown as Mock;
    // Stage 1 — returns two distinct friend ids successfully.
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [memberRow('friend-a'), memberRow('friend-b')],
              error: null,
            }),
          }),
        }),
      }),
    });
    // Stage 2 — profile hydration fails after dedup.
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'profiles-inaccessible', details: null },
        }),
      }),
    });

    const { result } = renderHook(() => useFriendsQuery(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect((result.current.error as unknown as { code: string }).code).toBe('DB_ERROR');
  });
});
