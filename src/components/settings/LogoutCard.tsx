/**
 * Nook · Settings · `<LogoutCard>`.
 *
 * Session-sign-out surface. Available to any logged-in user (Owner or
 * Friend). End-of-session needs an explicit confirm gate so an idle
 * cursor-tap on the button does not lock the user out mid-flow.
 *
 * Lifecycle:
 *  1. User clicks `Log out` → opens `<ConfirmModal>` with
 *     `phrase="logout"` (M6-6 reusable destructive modal).
 *  2. Inside the modal, the user types "logout" (case-insensitive,
 *     trim-aware) and clicks Submit. The card calls
 *     `useAuth().logout()` which delegates to `authApi.signOut()`.
 *  3. `logout()` clears local session + profile (useState), so the
 *     React selector-helpers (RequireAuth) redirect on the next
 *     navigation. We additionally `useNavigate('/welcome')` so the
 *     user lands on the public landing page (not the protected
 *     `/` route which would now error / re-redirect).
 *  4. Errors map via `codeToI18nKey` to the `settings.logout.error.*`
 *     strip and stay on the modal/card for retry.
 *
 * Spec alignment: home-level session control should be reachable
 * from one tap on /settings (parent layout, not nested under
 * profile/admin which are role-targeted).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useAuth } from '@/stores/useAuth';

type LogoutState =
  | { kind: 'idle' }
  | { kind: 'opening-modal' }
  | { kind: 'logging-out' }
  | { kind: 'error'; code: string; message: string };

function codeToI18nKey(code: string): string {
  switch (code) {
    case 'E_AUTH_UNAUTHORIZED':
      return 'settings.logout.error.unauthorized';
    default:
      return 'settings.logout.error.generic';
  }
}

export function LogoutCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const logoutAction = useAuth((s) => s.logout);
  const [state, setState] = useState<LogoutState>({ kind: 'idle' });

  const openConfirm = () => {
    if (!session) {
      setState({
        kind: 'error',
        code: 'E_AUTH_UNAUTHORIZED',
        message: t('settings.logout.error.unauthorized'),
      });
      return;
    }
    setState({ kind: 'opening-modal' });
  };

  const cancelConfirm = () => {
    setState({ kind: 'idle' });
  };

  const onConfirmLogout = async () => {
    if (state.kind !== 'opening-modal') return;
    setState({ kind: 'logging-out' });
    try {
      await logoutAction();
      // logout() already cleared session+profile locally. Navigate
      // explicitly so the user lands on the public landing page
      // (RequireAuth would otherwise bounce / -> /login).
      navigate('/welcome', { replace: true });
    } catch (err) {
      const m = err as { code?: string; message?: string };
      const code = m?.code ?? 'INTERNAL';
      setState({
        kind: 'error',
        code,
        message: m?.message ?? t('settings.logout.error.generic'),
      });
    }
  };

  // Modal stays open across opening-modal AND logging-out so the
  // spinner shows during the RPC round-trip.
  const modalOpen =
    state.kind === 'opening-modal' || state.kind === 'logging-out';

  return (
    <article
      data-testid="settings-logout-card"
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
          {t('settings.logout.title')}
        </h3>
        <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
          {t('settings.logout.subtitle')}
        </p>
      </div>

      {state.kind !== 'error' && (
        <div className="flex items-center gap-[var(--space-sm)]">
          <Button
            intent="neutral"
            size="md"
            onClick={openConfirm}
            disabled={!session}
            loading={state.kind === 'logging-out'}
            data-testid="settings-logout-open"
          >
            {t('settings.logout.chooseAction')}
          </Button>
        </div>
      )}

      {state.kind === 'error' && (
        <div
          role="alert"
          data-testid="settings-logout-error"
          className="flex flex-col gap-[var(--space-sm)]"
        >
          <p
            className="
              px-[var(--space-md)] py-[var(--space-sm)]
              text-[var(--font-size-meta)]
              text-[var(--color-signal-error)]
              bg-[var(--color-signal-error-soft)]
              border border-[var(--color-signal-error)]
              rounded-[var(--radius-md)]
            "
          >
            {t(codeToI18nKey(state.code))}
          </p>
          <div className="flex items-center gap-[var(--space-sm)]">
            <Button
              intent="neutral"
              size="md"
              onClick={() => setState({ kind: 'idle' })}
              data-testid="settings-logout-retry"
            >
              {t('common.retry')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modalOpen}
        title={t('settings.logout.confirm.title')}
        message={t('settings.logout.confirm.message')}
        phrase="logout"
        submitLabel={t('settings.logout.confirm.submit')}
        cancelLabel={t('settings.logout.confirm.cancel')}
        onCancel={cancelConfirm}
        onConfirm={onConfirmLogout}
        loading={state.kind === 'logging-out'}
        testIdPrefix="confirm-modal-logout"
      />
    </article>
  );
}
