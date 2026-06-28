import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFriendSignup } from '@/features/auth/hooks/useFriendSignup';
import type { InviteDetails } from '@/features/auth/hooks/useInviteValidation';

const signupSchema = z
  .object({
    displayName: z.string().min(1, 'auth.displayNameRequired').max(40, 'errors.internalError'),
    email: z.string().min(1, 'auth.emailRequired').email('errors.invalidEmail'),
    password: z.string().min(8, 'errors.passwordTooShort'),
    confirmPassword: z.string().min(1, 'auth.passwordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.passwordMismatch',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

interface InviteLandingProps {
  details: InviteDetails;
  token: string;
}

/**
 * InviteLanding — the invitation acceptance UI.
 *
 * Shows:
 * 1. A warm welcome card with the Owner's avatar + name
 * 2. A registration form
 * 3. On success, redirects to /home
 */
export function InviteLanding({ details, token }: InviteLandingProps) {
  const { t } = useTranslation();
  const { signup, isLoading, error } = useFriendSignup();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const translateError = (key?: string): string | undefined => {
    if (!key) return undefined;
    if (key.startsWith('auth.') || key.startsWith('errors.')) {
      return t(key);
    }
    return key;
  };

  const onSubmit = async (data: SignupFormData) => {
    await signup({
      inviteToken: token,
      email: data.email,
      password: data.password,
      displayName: data.displayName,
    });
    // Navigation happens inside useFriendSignup on success
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas-default)] p-[var(--space-xl)]">
      <div className="w-full max-w-[420px] space-y-[var(--space-xl)]">
        {/* ── Header Logo ── */}
        <div className="text-center">
          <h1 className="text-[var(--font-size-h3)] font-[600] text-[var(--color-ink-muted)] tracking-[0.3em] uppercase">
            Nook
          </h1>
        </div>

        {/* ── Owner Welcome Card ── */}
        <div className="flex flex-col items-center gap-[var(--space-md)] p-[var(--space-lg)] bg-[var(--color-surface-1)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-default)] shadow-[var(--shadow-2)] transition-all duration-[var(--transition-hover)] hover:shadow-[var(--shadow-3)]">
          {/* Owner Avatar */}
          <div className="relative">
            <Avatar
              name={details.ownerDisplayName}
              src={details.ownerAvatarUrl}
              size="lg"
              pulse={false}
            />
            {/* Subtle glow behind avatar */}
            <div
              className="absolute -inset-[6px] rounded-[var(--radius-circle)] opacity-20"
              style={{
                background: 'var(--color-accent-default)',
                filter: 'blur(12px)',
              }}
              aria-hidden="true"
            />
          </div>

          {/* Welcome Text */}
          <div className="text-center space-y-[var(--space-xs)]">
            <p className="text-[var(--font-size-caption)] text-[var(--color-ink-muted)]">
              {t('auth.inviteWelcome')}
            </p>
            <p className="text-[var(--font-size-h3)] font-[600] text-[var(--color-ink-default)]">
              {details.ownerDisplayName}
            </p>
            <p className="text-[var(--font-size-meta)] text-[var(--color-ink-subtle)] leading-[var(--leading-chill)] max-w-[280px] mx-auto">
              {t('auth.inviteSubtitle')}
            </p>
          </div>

          {/* Fade note */}
          <div className="flex items-center gap-[var(--space-xs)] px-[var(--space-md)] py-[var(--space-xs)] bg-[var(--color-surface-2)] rounded-[var(--radius-lg)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                fill="currentColor"
                opacity="0.6"
              />
            </svg>
            <span className="text-[var(--font-size-micro)] text-[var(--color-ink-muted)]">
              {t('auth.inviteMessageFade')}
            </span>
          </div>
        </div>

        {/* ── Registration Form ── */}
        <form
          className="flex flex-col gap-[var(--space-md)] p-[var(--space-lg)] bg-[var(--color-surface-1)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-default)]"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <p className="text-[var(--font-size-meta)] text-[var(--color-ink-subtle)] text-center mb-[var(--space-xs)]">
            {t('auth.inviteSignupDesc')}
          </p>

          {/* Display Name */}
          <Input
            variant="form"
            size="lg"
            type="text"
            placeholder={t('auth.displayName')}
            aria-label={t('auth.displayName')}
            error={translateError(errors.displayName?.message)}
            {...register('displayName')}
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
            {...register('email')}
          />

          {/* Password */}
          <Input
            variant="password"
            size="lg"
            placeholder={t('auth.password')}
            autoComplete="new-password"
            aria-label={t('auth.password')}
            hint={t('auth.invitePasswordHint')}
            error={translateError(errors.password?.message)}
            {...register('password')}
          />

          {/* Confirm Password */}
          <Input
            variant="password"
            size="lg"
            placeholder={t('auth.confirmPassword')}
            autoComplete="new-password"
            aria-label={t('auth.confirmPassword')}
            error={translateError(errors.confirmPassword?.message)}
            {...register('confirmPassword')}
          />

          {/* Error messages */}
          {error && (
            <p
              className="text-[var(--font-size-caption)] text-[var(--color-signal-error)] text-center"
              role="alert"
            >
              {translateError(error) ?? error}
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
            {isLoading ? t('auth.inviteJoining') : t('auth.inviteJoin')}
          </Button>
        </form>

        {/* ── Footer ── */}
        <p className="text-center text-[var(--font-size-micro)] text-[var(--color-ink-muted)]">
          Nook v1.0
        </p>
      </div>
    </div>
  );
}
