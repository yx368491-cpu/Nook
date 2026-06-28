import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
      <h1 className="text-[var(--font-size-display)] font-[600] text-[var(--color-ink-default)] mb-[var(--space-sm)]">
        404
      </h1>
      <p className="text-[var(--font-size-body)] text-[var(--color-ink-muted)] mb-[var(--space-xl)]">
        {t('common.error')}
      </p>
      <Link to="/">
        <Button intent="accent">{t('common.back')}</Button>
      </Link>
    </div>
  );
}
