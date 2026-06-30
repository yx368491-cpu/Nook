/**
 * Nook M6-4 · SettingsAdminPage `<PasswordResetCard>`.
 *
 * Replaces the M6-1 DISABLED placeholder. Active card lifecycle:
 *
 *  1. Friend picker (`<select>`) is hydrated by `useFriendsQuery`
 *     — alpha-sorted by display_name, dedup'd by user_id (RLS gates
 *     visibility; empty state when no friends).
 *  2. Owner clicks [Reset password] → `adminApi.createPasswordReset({ targetUserId })`
 *     invokes the admin-reset-password EF → returns `{ id, token,
 *     target_user_id, expires_at, reset_url }`.
 *  3. Success card reveals the URL with a [Copy link] button mirroring
 *     the InviteNewPage copy-button pattern (2s "Copied!" flash).
 *  4. Errors map via `mapAdminError` code → i18n-stripped text.
 *
 * Until the friend-side completion EF lands (M6-4.1), the reset URL
 * routes to `<ResetPasswordPlaceholderPage>` so the Owner can verify
 * the URL end-to-end visually.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/stores/useAuth';
import { adminApi } from '@/lib/api/admin';
import { useFriendsQuery } from '@/hooks/useFriendsQuery';

type ResetState =
  | { kind: 'idle' }
  | { kind: 'creating' }
  | { kind: 'error'; code: string; message: string }
  | {
      kind: 'created';
      friendUserId: string;
      friendName: string;
      resetUrl: string;
      expiresAt: string;
    };

function codeToI18nKey(code: string): string {
  switch (code) {
    case 'E_AUTH_UNAUTHORIZED':
      return 'settings.passwordReset.error.unauthorized';
    case 'E_AUTH_FORBIDDEN':
      return 'settings.passwordReset.error.forbidden';
    case 'E_RES_NOT_FOUND':
      return 'settings.passwordReset.error.friendNotFound';
    case 'E_RES_CONFLICT':
      // Triggered by the partial-unique index on
      // (target_user_id) WHERE password_reset AND pending; guards against
      // the Owner spam-clicking Reset while a prior reset is still live.
      return 'settings.passwordReset.error.alreadyPending';
    case 'E_VAL_INVALID_FORMAT':
    case 'E_VAL_REQUIRED_FIELD':
    case 'BAD_USER_ID': // EF-side raise for malformed target_user_id
    case 'BAD_TTL': // EF-side raise for ttl out of [1..168]
    case 'MALFORMED_BODY': // EF-side raise when body is not a JSON object
      return 'settings.passwordReset.error.invalidInput';
    case 'E_SYS_INTERNAL':
      return 'settings.passwordReset.error.internal';
    default:
      return 'settings.passwordReset.error.generic';
  }
}

export function PasswordResetCard() {
  const { t } = useTranslation();
  const session = useAuth((s) => s.session);
  const isOwner = useAuth((s) => s.profile?.role === 'owner');
  const friendsQuery = useFriendsQuery();

  const [friendUserId, setFriendUserId] = useState<string>('');
  const [state, setState] = useState<ResetState>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  const userId = session?.user.id ?? null;
  const friends = friendsQuery.data ?? [];
  const selectedFriend = friends.find((f) => f.userId === friendUserId) ?? null;

  const onCreate = async () => {
    if (!userId) {
      setState({
        kind: 'error',
        code: 'E_AUTH_UNAUTHORIZED',
        message: t('errors.unauthorized'),
      });
      return;
    }
    if (!isOwner) {
      setState({
        kind: 'error',
        code: 'E_AUTH_FORBIDDEN',
        message: t('settings.passwordReset.error.forbidden'),
      });
      return;
    }
    if (!friendUserId) {
      setState({
        kind: 'error',
        code: 'E_VAL_INVALID_FORMAT',
        message: t('settings.passwordReset.error.invalidInput'),
      });
      return;
    }
    setState({ kind: 'creating' });
    try {
      const result = await adminApi.createPasswordReset({
        targetUserId: friendUserId,
      });
      setState({
        kind: 'created',
        friendUserId,
        friendName: selectedFriend?.displayName ?? '?',
        resetUrl: result.reset_url,
        expiresAt: result.expires_at,
      });
    } catch (err) {
      const m = err as { code?: string; message?: string };
      const code = m?.code ?? 'INTERNAL';
      setState({
        kind: 'error',
        code,
        message: m?.message ?? t('settings.passwordReset.error.internal'),
      });
    }
  };

  const onCopy = async () => {
    if (state.kind !== 'created') return;
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(state.resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can reject in insecure contexts — silent no-op.
      setCopied(false);
    }
  };

  const onReset = () => {
    setState({ kind: 'idle' });
    setCopied(false);
  };

  return (
    <article
      data-testid="settings-admin-card-password"
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
          {t('settings.adminBox.sections.password.title')}
        </h3>
        <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
          {t('settings.adminBox.sections.password.subtitle')}
        </p>
      </div>

      {/* Friend picker (only when no created-state visible) */}
      {state.kind !== 'created' && (
        <>
          {friendsQuery.isLoading && (
            <div
              className="flex flex-col gap-[var(--space-sm)]"
              data-testid="settings-admin-password-loading"
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
              data-testid="settings-admin-password-no-friends"
            >
              {t('settings.passwordReset.noFriends')}
            </p>
          )}

          {!friendsQuery.isLoading && friends.length > 0 && (
            <>
              <div className="flex flex-col gap-[var(--space-sm)]">
                <label
                  htmlFor="settings-admin-password-friend-select"
                  className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)]"
                >
                  {t('settings.passwordReset.friendPickerLabel')}
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
                    id="settings-admin-password-friend-select"
                    value={friendUserId}
                    onChange={(e) => setFriendUserId(e.target.value)}
                    disabled={state.kind === 'creating'}
                    className="
                      flex-1 bg-transparent text-[var(--font-size-body-md)] text-[var(--color-ink-default)]
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
                      min-h-[44px]
                    "
                    data-testid="settings-admin-password-friend-select"
                  >
                    <option value="">
                      {t('settings.passwordReset.friendPickerPlaceholder')}
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
                  intent="neutral"
                  size="md"
                  onClick={onCreate}
                  disabled={
                    state.kind === 'creating' || friendUserId === ''
                  }
                  loading={state.kind === 'creating'}
                  data-testid="settings-admin-password-create"
                >
                  {state.kind === 'creating'
                    ? t('settings.passwordReset.creating')
                    : t('settings.passwordReset.create')}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* Error strip */}
      {state.kind === 'error' && (
        <p
          role="alert"
          data-testid="settings-admin-password-error"
          className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--font-size-meta)] text-[var(--color-signal-error)] bg-[var(--color-signal-error-soft)] border border-[var(--color-signal-error)] rounded-[var(--radius-md)]"
        >
          {t(codeToI18nKey(state.code))}
        </p>
      )}

      {/* Created card */}
      {state.kind === 'created' && (
        <div
          data-testid="settings-admin-password-created"
          className="
            flex flex-col gap-[var(--space-md)]
            rounded-[var(--radius-md)] border border-[var(--color-hairline-default)]
            bg-[var(--color-surface-2)]
            p-[var(--space-md)]
          "
        >
          <div className="flex items-center gap-[var(--space-sm)]">
            <Avatar
              name={state.friendName}
              src={
                friends.find((f) => f.userId === state.friendUserId)
                  ?.avatarUrl ?? null
              }
              size="sm"
            />
            <span className="text-[var(--font-size-body-md)] text-[var(--color-ink-default)]">
              {state.friendName}
            </span>
          </div>

          <div className="flex flex-col gap-[var(--space-2xs)]">
            <span className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)]">
              {t('settings.passwordReset.createdResetUrlLabel')}
            </span>
            <code
              data-testid="settings-admin-password-reset-url"
              className="
                block w-full px-[var(--space-md)] py-[var(--space-sm)]
                bg-[var(--color-surface-1)] border border-[var(--color-hairline-default)]
                rounded-[var(--radius-sm)] text-[var(--font-size-meta)]
                text-[var(--color-ink-default)] break-all
              "
            >
              {state.resetUrl}
            </code>
          </div>

          <div className="flex flex-col gap-[var(--space-2xs)]">
            <span className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)]">
              {t('settings.passwordReset.expiresAtLabel')}
            </span>
            <span className="text-[var(--font-size-meta)] text-[var(--color-ink-default)]">
              {new Date(state.expiresAt).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-[var(--space-sm)]">
            <Button
              intent="accent"
              size="md"
              onClick={onCopy}
              data-testid="settings-admin-password-copy"
            >
              {copied
                ? t('settings.passwordReset.copied')
                : t('settings.passwordReset.copyButton')}
            </Button>
            <Button
              intent="neutral"
              size="md"
              onClick={onReset}
              data-testid="settings-admin-password-done"
            >
              {t('settings.passwordReset.done')}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
