import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PasswordResetCard } from '@/components/settings/PasswordResetCard';
import { DeleteFriendCard } from '@/components/settings/DeleteFriendCard';

/**
 * Nook M6 · Settings → Admin page (F-SEC-04 / CAP-03 surface).
 *
 * Layout: per-section cards. Each card has a title, subtitle, and a
 * dedicated action surface.
 *   - Invite card · ACTIVE (M6-3 admin-create-invite UI)
 *   - Reset password card · ACTIVE (M6-4 admin-reset-password)
 *   - Delete friend card · ACTIVE (M6-5 admin-delete-friend + M6-6
 *     confirm modal — S43.0 docs sync sibling ship).
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
        {/* Invite card · ACTIVE (M6-3) */}
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

        {/* Delete friend card · ACTIVE (M6-5 + M6-6 sibling ship) */}
        <DeleteFriendCard />
      </div>
    </div>
  );
}
