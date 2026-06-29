/**
 * Nook M6-4 · Friend-side placeholder page at `/reset-password/:token`.
 *
 * Until M6-4.1 ships the full friend-side completion flow (the EF that
 * accepts the new password and updates `auth.users.encrypted_password`),
 * the URL the Owner generates via `<PasswordResetCard>` lands here as
 * a clear "coming soon" surface. This makes the Owner flow end-to-end
 * verifiable visually (open URL → see this page) without waiting on
 * the friend EF.
 *
 * Beyond this static surface, the page is intentionally minimal: it
 * echoes the token but does NOT `<form>`-submit it anywhere. v1.0
 * privacy posture is to be honest about what's available; placeholder
 * pages that look like functional forms invite users to type sensitive
 * data into the void.
 */

import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPlaceholderPage() {
  const { t } = useTranslation();
  const params = useParams<{ token: string }>();
  const token = params.token ?? '';

  return (
    <div
      className="
        flex flex-col items-center gap-[var(--space-lg)]
        max-w-[480px] mx-auto
        px-[var(--space-lg)] py-[var(--space-3xl)]
      "
      data-testid="reset-password-placeholder-page"
    >
      <div className="flex flex-col items-center gap-[var(--space-sm)] text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          className="text-[var(--color-ink-muted)]"
        >
          <rect
            x="9"
            y="20"
            width="30"
            height="20"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 20v-4a8 8 0 0 1 16 0v4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="24" cy="30" r="2" fill="currentColor" />
        </svg>
        <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-ink-default)]">
          {t('resetPlaceholder.title')}
        </h1>
        <p className="text-[var(--font-size-body-md)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
          {t('resetPlaceholder.subtitle')}
        </p>
      </div>

      {token && (
        <div
          className="
            w-full px-[var(--space-md)] py-[var(--space-sm)]
            bg-[var(--color-surface-2)] border border-[var(--color-hairline-default)]
            rounded-[var(--radius-md)]
          "
          data-testid="reset-password-placeholder-token"
        >
          <span className="block text-[var(--font-size-meta)] text-[var(--color-ink-muted)] mb-[var(--space-2xs)]">
            {t('resetPlaceholder.tokenLabel')}
          </span>
          <code className="block text-[var(--font-size-meta)] text-[var(--color-ink-default)] break-all">
            {token}
          </code>
        </div>
      )}

      <Link to="/welcome">
        <Button intent="accent" size="md" data-testid="reset-password-placeholder-home">
          {t('resetPlaceholder.home')}
        </Button>
      </Link>
    </div>
  );
}
