import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/stores/useAuth';

export default function WelcomePage() {
  const { t } = useTranslation();
  const session = useAuth((s) => s.session);
  const isInitialized = useAuth((s) => s.isInitialized);

  // Wait for auth to initialize before deciding redirect
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas-default)]">
        <span className="text-[var(--color-ink-muted)]">{t('common.loading')}</span>
      </div>
    );
  }

  // Already logged in → go to home
  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
      {/* Logo / Brand */}
      <div className="text-center max-w-[420px]">
        <h1 className="text-[var(--font-size-display)] font-[600] text-[var(--color-ink-default)] mb-[var(--space-xs)] tracking-[-0.02em]">
          {t('app.name')}
        </h1>
        <p className="text-[var(--font-size-body)] text-[var(--color-ink-muted)] mb-[var(--space-lg)] leading-[var(--leading-relaxed)]">
          {t('auth.welcomeMessage')}
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-[var(--space-md)] w-full max-w-[360px]">
        <Link to="/welcome/register" className="w-full sm:w-1/2">
          <Button intent="accent" size="lg" className="w-full">
            {t('auth.registerAction')}
          </Button>
        </Link>
        <Link to="/login" className="w-full sm:w-1/2">
          <Button intent="neutral" size="lg" className="w-full">
            {t('auth.loginAction')}
          </Button>
        </Link>
      </div>
    </main>
  );
}
