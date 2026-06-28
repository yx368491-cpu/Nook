import { useTranslation } from 'react-i18next';

export default function GroupSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
      <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-ink-default)]">
        {t('settings.title')} — {t('common.group')}
      </h1>
    </div>
  );
}
