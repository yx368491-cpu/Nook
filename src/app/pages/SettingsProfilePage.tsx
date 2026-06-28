import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SettingsProfilePage() {
  const { t } = useTranslation();

  return (
    <form className="max-w-[400px] flex flex-col gap-[var(--space-md)]" onSubmit={(e) => e.preventDefault()}>
      <Input variant="form" size="lg" placeholder={t('settings.displayName')} />
      <Button intent="accent">{t('settings.save')}</Button>
    </form>
  );
}
