/**
 * Nook M6-5 · SettingsAdminPage `<DeleteFriendCard>`.
 *
 * Replaces the M6-1 DISABLED placeholder. Active card lifecycle:
 *
 *  1. Friend picker (`<select>`) is hydrated by `useFriendsQuery`
 *     — alpha-sorted by display_name (RLS gates visibility; empty
 *     state when no friends remain).
 *  2. Owner clicks `Delete friend` → opens `<ConfirmModal>` with
 *     `phrase="confirm"` (M6-6 reusable destructive modal).
 *  3. Inside the modal, the Owner types "confirm" (case-insensitive)
 *     and clicks Submit. The card calls `adminApi.deleteFriend()`
 *     which delegates to `fn_admin_delete_friend` RPC. Idempotent:
 *     re-clicks converge on the same `deleted_at` instant.
 *  4. Success card reveals `deleted_at` + `conversations_left` count
 *     so the Owner knows what was affected. The picker refreshes
 *     automatically via the `useDeleteFriend.onSuccess` cache
 *     invalidation so the deleted friend drops out.
 *  5. Errors map via `mapAdminError` code → i18n-stripped text.
 *
 * SPEC alignment:
 *  - F-SEC-06: Soft-delete (not hard) — friends kept around as
 *    "inactive" (deleted_at) so historical message attributions stay.
 *  - BF-14: Owner's UI for an inactive friend (post-delete: the
 *    dropped-from-picker state + success card).
 *  - CAP-20 / AC.18: Owner-only action with explicit phrase gate.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useAuth } from '@/stores/useAuth';
import { useFriendsQuery } from '@/hooks/useFriendsQuery';
import { useDeleteFriend } from '@/hooks/useDeleteFriend';

type DeleteState =
  | { kind: 'idle' }
  | {
      kind: 'opening-modal';
      targetFriendUserId: string;
      targetFriendName: string;
    }
  | {
      kind: 'deleting';
      targetFriendUserId: string;
      targetFriendName: string;
    }
  | { kind: 'error'; code: string; message: string }
  | {
      kind: 'deleted';
      friendUserId: string;
      friendName: string;
      conversations_left: number;
      deleted_at: string;
    };

function codeToI18nKey(code: string): string {
  switch (code) {
    case 'E_AUTH_UNAUTHORIZED':
      return 'settings.deleteFriend.error.unauthorized';
    case 'E_AUTH_FORBIDDEN':
      return 'settings.deleteFriend.error.forbidden';
    case 'E_RES_NOT_FOUND':
      return 'settings.deleteFriend.error.friendNotFound';
    case 'E_VAL_INVALID_FORMAT':
    case 'E_VAL_REQUIRED_FIELD':
    case 'BAD_USER_ID': // EF-side raise for malformed target_user_id
    case 'MALFORMED_BODY': // EF-side raise when body is not a JSON object
      return 'settings.deleteFriend.error.invalidInput';
    case 'E_SYS_INTERNAL':
      return 'settings.deleteFriend.error.internal';
    default:
      return 'settings.deleteFriend.error.generic';
  }
}

export function DeleteFriendCard() {
  const { t } = useTranslation();
  const session = useAuth((s) => s.session);
  const isOwner = useAuth((s) => s.profile?.role === 'owner');
  const friendsQuery = useFriendsQuery();
  const deleteMutation = useDeleteFriend();

  const [friendUserId, setFriendUserId] = useState<string>('');
  const [state, setState] = useState<DeleteState>({ kind: 'idle' });

  const userId = session?.user.id ?? null;
  const friends = friendsQuery.data ?? [];
  const selectedFriend = friends.find((f) => f.userId === friendUserId) ?? null;

  const openConfirm = () => {
    if (!userId) {
      setState({
        kind: 'error',
        code: 'E_AUTH_UNAUTHORIZED',
        message: t('settings.deleteFriend.error.unauthorized'),
      });
      return;
    }
    if (!isOwner) {
      setState({
        kind: 'error',
        code: 'E_AUTH_FORBIDDEN',
        message: t('settings.deleteFriend.error.forbidden'),
      });
      return;
    }
    if (!friendUserId) {
      setState({
        kind: 'error',
        code: 'E_VAL_INVALID_FORMAT',
        message: t('settings.deleteFriend.error.invalidInput'),
      });
      return;
    }
    setState({
      kind: 'opening-modal',
      targetFriendUserId: friendUserId,
      targetFriendName: selectedFriend?.displayName ?? '?',
    });
  };

  const cancelConfirm = () => {
    setState({ kind: 'idle' });
  };

  const onConfirmDelete = async () => {
    if (state.kind !== 'opening-modal') return;
    const targetUserId = state.targetFriendUserId;
    setState({
      kind: 'deleting',
      targetFriendUserId: targetUserId,
      targetFriendName: state.targetFriendName,
    });
    try {
      const result = await deleteMutation.mutateAsync({ targetUserId });
      setState({
        kind: 'deleted',
        friendUserId: targetUserId,
        friendName: state.targetFriendName,
        conversations_left: result.conversations_left,
        deleted_at: result.deleted_at,
      });
      // Clear picker — the friend picker now queries without the
      // deleted friend (via the cache invalidation above).
      setFriendUserId('');
    } catch (err) {
      const m = err as { code?: string; message?: string };
      const code = m?.code ?? 'INTERNAL';
      setState({
        kind: 'error',
        code,
        message: m?.message ?? t('settings.deleteFriend.error.internal'),
      });
    }
  };

  const onDone = () => {
    setState({ kind: 'idle' });
  };

  // Modal is open during 'opening-modal' AND 'deleting' so the
  // spinner shows during the RPC round-trip.
  const modalOpen =
    state.kind === 'opening-modal' || state.kind === 'deleting';

  return (
    <article
      data-testid="settings-admin-card-delete"
      className="
        flex flex-col gap-[var(--space-md)]
        rounded-[var(--radius-xl)] border border-[var(--color-hairline-default)]
        bg-[var(--color-surface-1)]
        p-[var(--space-lg)]
        shadow-[var(--shadow-2)]
        transition-shadow duration-[var(--transition-hover)]
        hover:shadow-[var(--shadow-3)]
      "
    >
      <div className="flex flex-col gap-[var(--space-2xs)]">
        <h3 className="text-[var(--font-size-body-lg)] font-[600] text-[var(--color-ink-default)]">
          {t('settings.deleteFriend.title')}
        </h3>
        <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
          {t('settings.deleteFriend.subtitle')}
        </p>
      </div>

      {state.kind !== 'deleted' && (
        <>
          {friendsQuery.isLoading && (
            <div
              className="flex flex-col gap-[var(--space-sm)]"
              data-testid="settings-admin-delete-loading"
              aria-busy="true"
            >
              <Skeleton width={80} height={12} variant="text" />
              <div className="flex items-center gap-[var(--space-sm)]">
                <Skeleton width={28} height={28} variant="circle" />
                <Skeleton className="flex-1" height={44} />
              </div>
            </div>
          )}

          {!friendsQuery.isLoading && friends.length === 0 && (
            <p
              className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)]"
              data-testid="settings-admin-delete-no-friends"
            >
              {t('settings.deleteFriend.noFriends')}
            </p>
          )}

          {!friendsQuery.isLoading && friends.length > 0 && (
            <>
              <div className="flex flex-col gap-[var(--space-sm)]">
                <label
                  htmlFor="settings-admin-delete-friend-select"
                  className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)]"
                >
                  {t('settings.deleteFriend.pickerLabel')}
                </label>
                <div
                  className="
                    flex items-center gap-[var(--space-sm)]
                    rounded-[var(--radius-md)] border border-[var(--color-hairline-default)]
                    bg-[var(--color-surface-2)]
                    px-[var(--space-md)] py-[var(--space-sm)]
                    min-h-[44px]
                  "
                >
                  {selectedFriend && (
                    <Avatar
                      name={selectedFriend.displayName}
                      src={selectedFriend.avatarUrl}
                      size="sm"
                    />
                  )}
                  <select
                    id="settings-admin-delete-friend-select"
                    value={friendUserId}
                    onChange={(e) => setFriendUserId(e.target.value)}
                    disabled={state.kind === 'deleting'}
                    className="
                      flex-1 bg-transparent text-[var(--font-size-body-md)] text-[var(--color-ink-default)]
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
                      min-h-[44px]
                    "
                    data-testid="settings-admin-delete-friend-select"
                  >
                    <option value="">
                      {t('settings.deleteFriend.pickerPlaceholder')}
                    </option>
                    {friends.map((f) => (
                      <option key={f.userId} value={f.userId}>
                        {f.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-[var(--space-sm)]">
                <Button
                  intent="danger"
                  size="md"
                  onClick={openConfirm}
                  disabled={friendUserId === ''}
                  loading={state.kind === 'deleting'}
                  data-testid="settings-admin-delete-open"
                >
                  {t('settings.deleteFriend.chooseAction')}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {state.kind === 'error' && (
        <p
          role="alert"
          data-testid="settings-admin-delete-error"
          className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--font-size-meta)] text-[var(--color-signal-error)] bg-[var(--color-signal-error-soft)] border border-[var(--color-signal-error)] rounded-[var(--radius-md)]"
        >
          {t(codeToI18nKey(state.code))}
        </p>
      )}

      {state.kind === 'deleted' && (
        <div
          data-testid="settings-admin-delete-success"
          className="
            flex flex-col gap-[var(--space-md)]
            rounded-[var(--radius-md)] border border-[var(--color-hairline-default)]
            bg-[var(--color-surface-2)]
            p-[var(--space-md)]
          "
        >
          <p className="text-[var(--font-size-meta)] text-[var(--color-ink-default)]">
            {t('settings.deleteFriend.deleted', {
              date: new Date(state.deleted_at).toLocaleString(),
              count: state.conversations_left,
            })}
          </p>
          <div className="flex items-center gap-[var(--space-sm)]">
            <Button
              intent="neutral"
              size="md"
              onClick={onDone}
              data-testid="settings-admin-delete-done"
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modalOpen}
        title={t('settings.deleteFriend.confirm.title', {
          name:
            (state.kind === 'opening-modal' || state.kind === 'deleting') &&
            state.targetFriendName !== '?'
              ? state.targetFriendName
              : selectedFriend?.displayName ?? '?',
        })}
        message={t('settings.deleteFriend.confirm.message', {
          name:
            (state.kind === 'opening-modal' || state.kind === 'deleting') &&
            state.targetFriendName !== '?'
              ? state.targetFriendName
              : selectedFriend?.displayName ?? '?',
        })}
        warning={t('settings.deleteFriend.confirm.warning')}
        submitLabel={t('settings.deleteFriend.confirm.submit')}
        cancelLabel={t('common.cancel')}
        onCancel={cancelConfirm}
        onConfirm={onConfirmDelete}
        loading={state.kind === 'deleting'}
        testIdPrefix="confirm-modal-delete"
      />
    </article>
  );
}
