import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
import { LogoutCard } from '@/components/settings/LogoutCard';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';
    void i18n.changeLanguage(next);
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
      <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-ink-default)] mb-[var(--space-lg)]">
        {t('settings.title')}
      </h1>
      <nav aria-label={t('settings.title')} className="flex gap-[var(--space-md)] mb-[var(--space-lg)]">
        <Link to="/settings/profile" className="text-[var(--color-accent-default)]">{t('settings.profile.name')}</Link>
        <Link to="/settings/admin" className="text-[var(--color-accent-default)]">{t('settings.admin')}</Link>
      </nav>
      <div className="mb-[var(--space-lg)]">
        <label className="text-[var(--font-size-caption)] text-[var(--color-ink-muted)] block mb-[var(--space-xs)]">
          {t('settings.language')}
        </label>
        <button
          type="button"
          onClick={toggleLanguage}
          className="px-[var(--space-md)] py-[var(--space-sm)] min-h-[44px] bg-[var(--color-surface-1)] rounded-[var(--radius-md)] text-[var(--color-ink-default)] border border-[var(--color-hairline-default)] focus-visible:outline-[2px] focus-visible:outline-[var(--color-accent-soft-ring)] focus-visible:outline-offset-[2px]"
        >
          {i18n.language === 'zh-CN' ? 'English' : '中文'}
        </button>
      </div>

      {/* Session-end card — placed BEFORE the Outlet so it's immediately
          visible the moment the user lands on /settings (whether via the
          Sidebar footer "Settings" link, the Sidebar avatar, or any deep
          link). Without this, logout would be one full-screen scroll
          below the profile/admin cards. */}
      <div className="mb-[var(--space-lg)] max-w-[400px]">
        <LogoutCard />
      </div>

      <Outlet />
    </div>
  );
}
