/**
 * Nook M6-4 · Owner-friend-list query hook.
 *
 * Wrapper around `listFriendsOfOwner` with 30s staleTime (matches
 * `useConversationsQuery`), enabling the `<PasswordResetCard>`
 * picker to be reactive without round-tripping on every settings-tab
 * mount. refetchOnWindowFocus is intentionally true so banning/restoring
 * a friend in another tab updates the picker on next focus.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/stores/useAuth';
import {
  listFriendsOfOwner,
  type FriendRow,
} from '@/lib/api/friends';

export function useFriendsQuery() {
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useQuery<FriendRow[]>({
    queryKey: ['friends', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([] as FriendRow[]);
      return listFriendsOfOwner(userId);
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
