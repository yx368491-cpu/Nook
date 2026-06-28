import { useTranslation } from 'react-i18next';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

export default function ErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();

  let message = t('common.error');
  if (isRouteErrorResponse(error)) {
    message = error.statusText;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
      <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-signal-error)] mb-[var(--space-sm)]">
        {t('common.error')}
      </h1>
      <p className="text-[var(--font-size-body)] text-[var(--color-ink-muted)]">
        {message}
      </p>
    </div>
  );
}
