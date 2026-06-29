/**
 * Nook M6-5 · `useDeleteFriend` — TanStack Query mutation wrapper.
 *
 * Mirrors the M4-7 `useAddReaction` / `useRemoveReaction` shape so
 * callers stay uniform across admin/messaging mutations. On success
 * invalidates the friends query so the picker refreshes (the deleted
 * friend naturally drops out of `listFriendsOfOwner` because their
 * `conversation_members.left_at` is now set — and the picker query
 * filters on `is('left_at', null)`).
 *
 * Error envelope: `adminApi.deleteFriend` throws `{ code, message }`
 * via mapAdminError. The hook forwards the same shape so the caller
 * (DeleteFriendCard) can branch on `.code` directly without inspecting
 * the cause chain.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type DeletedFriendSummary } from '@/lib/api/admin';
import { useAuth } from '@/stores/useAuth';

export function useDeleteFriend() {
  const qc = useQueryClient();
  const userId = useAuth(
    (s) => s.profile?.id ?? s.session?.user.id ?? null,
  );

  return useMutation<
    DeletedFriendSummary,
    { code: string; message: string },
    { targetUserId: string }
  >({
    mutationFn: ({ targetUserId }) =>
      adminApi.deleteFriend({ targetUserId }),
    onSuccess: () => {
      // The picker is fed by useFriendsQuery which keys on
      // ['friends', userId]. Invalidate to refetch the fresh list —
      // the deleted friend will drop out on the active-members
      // filter inside listFriendsOfOwner.
      void qc.invalidateQueries({ queryKey: ['friends', userId] as const });
    },
  });
}
