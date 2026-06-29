import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PasswordResetCard } from '@/components/settings/PasswordResetCard';

/**
 * Nook M6 · Settings → Admin page (F-SEC-04 / CAP-03 surface).
 *
 * Layout: per-section cards. Each card has a title, subtitle, and a single
 * CTA. M6-1: Invite + reset + delete (the latter two were disabled stubs).
 * M6-4: Reset password card is now ACTIVE — the delete-friend card remains
 * a DISABLED stub since M6-5 is a separate increment.
 */
export default function SettingsAdminPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-[var(--space-lg)]">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-[var(--space-2xs)]">
        <h2 className="text-[var(--font-size-h3)] font-[600] text-[var(--color-ink-default)]">
          {t('settings.adminBox.title')}
        </h2>
        <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
          {t('settings.adminBox.subtitle')}
        </p>
      </div>

      {/* ── Action cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-md)]">
        {/* Invite card · ACTIVE */}
        <article
          data-testid="settings-admin-card-invite"
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
              {t('settings.adminBox.sections.invite.title')}
            </h3>
            <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
              {t('settings.adminBox.sections.invite.subtitle')}
            </p>
          </div>
          <Link to="/invite/new" className="self-start">
            <Button
              intent="accent"
              size="md"
              data-testid="settings-admin-invite-link"
            >
              {t('settings.adminBox.sections.invite.action')}
            </Button>
          </Link>
        </article>

        {/* Reset password card · ACTIVE (M6-4) */}
        <PasswordResetCard />

        {/* Delete friend card · DISABLED PLACEHOLDER (M6-5) */}
        <article
          data-testid="settings-admin-card-delete"
          className="
            flex flex-col gap-[var(--space-md)]
            rounded-[var(--radius-xl)] border border-[var(--color-hairline-default)]
            bg-[var(--color-surface-1)]
            p-[var(--space-lg)]
            opacity-60
          "
        >
          <div className="flex flex-col gap-[var(--space-2xs)]">
            <h3
              className="text-[font-size-body-lg] font-[600] text-[var(--color-ink-default)]"
              style={{ fontSize: 'var(--font-size-body-lg)' }}
            >
              {t('settings.adminBox.sections.delete.title')}
            </h3>
            <p className="text-[var(--font-size-meta)] text-[var(--color-ink-muted)] leading-[var(--leading-chill)]">
              {t('settings.adminBox.sections.delete.subtitle')}
            </p>
          </div>
          <Button
            intent="danger"
            size="md"
            disabled
            aria-disabled="true"
            data-testid="settings-admin-delete-disabled"
          >
            {t('settings.adminBox.sections.delete.action')}
          </Button>
        </article>
      </div>
    </div>
  );
}
