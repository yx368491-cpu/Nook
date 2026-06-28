import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export default function InviteNewPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
      <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-ink-default)] mb-[var(--space-lg)]">
        {t('settings.createInvite')}
      </h1>
      <Button intent="accent" size="lg">{t('settings.createInvite')}</Button>
    </div>
  );
}
