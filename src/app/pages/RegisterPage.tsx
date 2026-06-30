import { useTranslation } from 'react-i18next';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/stores/useAuth';

const registerSchema = z
  .object({
    displayName: z.string().min(1, 'auth.displayNameRequired').max(40),
    email: z.string().min(1, 'auth.emailRequired').email('errors.invalidEmail'),
    password: z.string().min(8, 'errors.passwordTooShort'),
    confirmPassword: z.string().min(1, 'auth.passwordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.passwordMismatch',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const isLoading = useAuth((s) => s.isLoading);
  const error = useAuth((s) => s.error);
  const register = useAuth((s) => s.register);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Already logged in → go to home
  if (session) {
    return <Navigate to="/home" replace />;
  }

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data.email, data.password, data.displayName);
      navigate('/home', { replace: true });
    } catch (err: unknown) {
      // Error is already set in the store, but we also set form root error
      const code = err && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : null;
      const message =
        code === 'email_taken' || code === 'ALREADY_USED'
          ? 'auth.emailInUse'
          : 'errors.internalError';
      setError('root', { message });
    }
  };

  const translateError = (key?: string): string | undefined => {
    if (!key) return undefined;
    // Keys starting with 'auth.' or 'errors.' are i18n keys
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
            {t('auth.createOwnerTitle')}
          </h1>
          <p className="text-[var(--font-size-meta)] text-[var(--color-ink-subtle)]">
            {t('auth.createOwnerDesc')}
          </p>
        </div>

        {/* Form */}
        <form
          className="flex flex-col gap-[var(--space-md)]"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {/* Display Name */}
          <Input
            variant="form"
            size="lg"
            type="text"
            placeholder={t('auth.displayName')}
            aria-label={t('auth.displayName')}
            error={translateError(errors.displayName?.message)}
            {...formRegister('displayName')}
          />

          {/* Email */}
          <Input
            variant="form"
            size="lg"
            type="email"
            placeholder={t('auth.email')}
            autoComplete="email"
            aria-label={t('auth.email')}
            error={translateError(errors.email?.message)}
            {...formRegister('email')}
          />

          {/* Password */}
          <Input
            variant="form"
            size="lg"
            type="password"
            placeholder={t('auth.password')}
            autoComplete="new-password"
            aria-label={t('auth.password')}
            error={translateError(errors.password?.message)}
            {...formRegister('password')}
          />

          {/* Confirm Password */}
          <Input
            variant="form"
            size="lg"
            type="password"
            placeholder={t('auth.confirmPassword')}
            autoComplete="new-password"
            aria-label={t('auth.confirmPassword')}
            error={translateError(errors.confirmPassword?.message)}
            {...formRegister('confirmPassword')}
          />

          {/* Server Error */}
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
            {isLoading ? t('auth.creatingAccount') : t('auth.registerAction')}
          </Button>
        </form>

        {/* Footer link */}
        <p className="mt-[var(--space-lg)] text-center text-[var(--font-size-caption)] text-[var(--color-ink-muted)]">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-[var(--color-accent-default)] hover:underline focus-visible:underline">
            {t('auth.loginAction')}
          </Link>
        </p>
      </div>
    </main>
  );
}
