import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useInviteValidation } from '@/features/auth/hooks/useInviteValidation';
import { InviteLanding } from '@/features/auth/components/InviteLanding';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * InviteAcceptPage — M2-4 /invite/:token
 *
 * Flow:
 * 1. Extract :token from URL params
 * 2. Call fn_get_invite_details RPC to validate
 * 3. If loading → show skeleton
 * 4. If invalid → show error state or redirect to /404
 * 5. If valid → show InviteLanding with Owner info + registration form
 */
export default function InviteAcceptPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const { isLoading, isValid, details, reason, error } = useInviteValidation(token);

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
        <div className="w-full max-w-[420px] space-y-[var(--space-lg)]">
          {/* Logo skeleton */}
          <div className="flex justify-center">
            <Skeleton width={80} height={24} variant="text" />
          </div>

          {/* Owner card skeleton */}
          <div className="flex flex-col items-center gap-[var(--space-md)] p-[var(--space-lg)] bg-[var(--color-surface-1)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-default)]">
            <Skeleton width={48} height={48} variant="circle" />
            <div className="flex flex-col gap-[var(--space-xs)] items-center">
              <Skeleton width={120} height={12} variant="text" />
              <Skeleton width={160} height={20} variant="text" />
            </div>
          </div>

          {/* Form skeleton */}
          <div className="flex flex-col gap-[var(--space-md)] p-[var(--space-lg)] bg-[var(--color-surface-1)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-default)]">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-full" height={48} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Error / Invalid states ─────────────────────────────────
  if (!isValid) {
    // Map reason to user-facing messages
    const errorTitleKey = (() => {
      switch (reason) {
        case 'expired': return 'auth.inviteExpired';
        case 'used': return 'auth.inviteUsed';
        case 'owner_deleted': return 'auth.inviteOwnerDeleted';
        default: return 'auth.inviteNotFound';
      }
    })();

    const errorIcon = (() => {
      switch (reason) {
        case 'expired': return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </svg>
        );
        case 'used': return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </svg>
        );
        default: return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </svg>
        );
      }
    })();

    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
        <div className="w-full max-w-[380px] flex flex-col items-center gap-[var(--space-lg)] text-center">
          {/* Error icon */}
          <div className="text-[var(--color-ink-muted)]">
            {errorIcon}
          </div>

          {/* Title */}
          <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-ink-default)]">
            {t(errorTitleKey)}
          </h1>

          {/* Description */}
          <p className="text-[var(--font-size-body)] text-[var(--color-ink-subtle)] leading-[var(--leading-chill)]">
            {reason === 'owner_deleted'
              ? t('auth.inviteOwnerDeleted')
              : t('common.error')}
          </p>

          {/* Error details (for dev debugging) */}
          {error && (
            <p className="text-[var(--font-size-caption)] text-[var(--color-signal-error)]">
              {error}
            </p>
          )}

          {/* Retry or back to welcome */}
          <div className="flex gap-[var(--space-md)] pt-[var(--space-sm)]">
            <Button
              intent="neutral"
              size="md"
              onClick={() => window.location.reload()}
              aria-label={t('common.retry')}
            >
              {t('common.retry')}
            </Button>
            <Link to="/welcome">
              <Button intent="accent" size="md">
                {t('auth.welcome')}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Valid invite: show landing ─────────────────────────────
  return (
    <InviteLanding
      key={token}
      details={details!}
      token={token!}
    />
  );
}
