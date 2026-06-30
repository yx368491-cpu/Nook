import { useTranslation } from 'react-i18next';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/stores/useAuth';

const loginSchema = z.object({
  email: z.string().min(1, 'auth.emailRequired').email('errors.invalidEmail'),
  password: z.string().min(1, 'auth.passwordRequired'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const isLoading = useAuth((s) => s.isLoading);
  const error = useAuth((s) => s.error);
  const login = useAuth((s) => s.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Already logged in → go to home
  if (session) {
    return <Navigate to="/home" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/home', { replace: true });
    } catch {
      setError('root', { message: 'errors.invalidCredentials' });
    }
  };

  const translateError = (key?: string): string | undefined => {
    if (!key) return undefined;
    if (key.startsWith('auth.') || key.startsWith('errors.')) {
      return t(key);
    }
    return key;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
      <div className="w-full max-w-[380px]">
        {/* Header */}
        <div className="text-center mb-[var(--space-xl)]">
          <h1 className="text-[var(--font-size-h2)] font-[600] text-[var(--color-ink-default)] mb-[var(--space-xs)]">
            {t('auth.loginTitle')}
          </h1>
        </div>

        {/* Form */}
        <form
          className="flex flex-col gap-[var(--space-md)]"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {/* Email */}
          <Input
            variant="form"
            size="lg"
            type="email"
            placeholder={t('auth.email')}
            autoComplete="email"
            aria-label={t('auth.email')}
            error={translateError(errors.email?.message)}
            {...register('email')}
          />

          {/* Password */}
          <Input
            variant="form"
            size="lg"
            type="password"
            placeholder={t('auth.password')}
            autoComplete="current-password"
            aria-label={t('auth.password')}
            error={translateError(errors.password?.message)}
            {...register('password')}
          />

          {/* Server / root Error */}
          {errors.root && (
            <p
              className="text-[var(--font-size-caption)] text-[var(--color-signal-error)] text-center"
              role="alert"
            >
              {translateError(errors.root.message)}
            </p>
          )}

          {/* Generic error from store */}
          {error && !errors.root && (
            <p
              className="text-[var(--font-size-caption)] text-[var(--color-signal-error)] text-center"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            intent="accent"
            size="lg"
            className="w-full"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? t('auth.loggingIn') : t('auth.loginAction')}
          </Button>
        </form>

        {/* Footer link */}
        <p className="mt-[var(--space-lg)] text-center text-[var(--font-size-caption)] text-[var(--color-ink-muted)]">
          {t('auth.noAccount')}{' '}
          <Link
            to="/welcome/register"
            className="text-[var(--color-accent-default)] hover:underline focus-visible:underline"
          >
            {t('auth.registerAction')}
          </Link>
        </p>
      </div>
    </main>
  );
}
