import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function SettingsAdminPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <Link to="/invite/new">
        <Button intent="accent">{t('settings.createInvite')}</Button>
      </Link>
      <Button intent="neutral">{t('settings.resetPassword')}</Button>
      <Button intent="danger">{t('settings.deleteFriend')}</Button>
    </div>
  );
}
