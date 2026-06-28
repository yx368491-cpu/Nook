import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';

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
      <div className="flex gap-[var(--space-md)] mb-[var(--space-lg)]">
        <Link to="/settings/profile" className="text-[var(--color-accent-default)]">{t('settings.profile')}</Link>
        <Link to="/settings/admin" className="text-[var(--color-accent-default)]">{t('settings.admin')}</Link>
      </div>
      <div className="mb-[var(--space-lg)]">
        <label className="text-[var(--font-size-caption)] text-[var(--color-ink-muted)] block mb-[var(--space-xs)]">
          {t('settings.language')}
        </label>
        <button
          type="button"
          onClick={toggleLanguage}
          className="px-[var(--space-md)] py-[var(--space-sm)] bg-[var(--color-surface-1)] rounded-[var(--radius-md)] text-[var(--color-ink-default)] border border-[var(--color-hairline-default)]"
        >
          {i18n.language === 'zh-CN' ? 'English' : '中文'}
        </button>
      </div>
      <Outlet />
    </div>
  );
}
