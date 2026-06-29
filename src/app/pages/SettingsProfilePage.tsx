/**
 * Nook M5-6 · `/settings/profile`.
 *
 * Two independent sections, each with its own save affordance:
 *   1. `<AvatarPicker />` (M5-6 · F-AUTH-09 / AC.13) — pick / save / remove
 *   2. Display name form — Input + Save (F-AUTH-08)
 *
 * Spec scope reference: Nook-SPEC § F-AUTH-08 / F-AUTH-09 / F-AUTH-10.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AvatarPicker } from '@/components/settings/AvatarPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/stores/useAuth';

export default function SettingsProfilePage() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const updateProfileAction = useAuth((s) => s.updateProfile);
  const isLoading = useAuth((s) => s.isLoading);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-sync local input when profile changes (e.g. after re-login).
  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const next = displayName.trim();
    if (!next) {
      setError(t('auth.displayNameRequired'));
      return;
    }
    if (next === profile?.displayName) {
      setSaved(true);
      return;
    }
    try {
      await updateProfileAction({ displayName: next });
      setSaved(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : t('common.error');
      setError(msg);
    }
  };

  return (
    <div className="max-w-[400px] flex flex-col gap-[var(--space-xl)]">
      <AvatarPicker />

      <form className="flex flex-col gap-[var(--space-md)]" onSubmit={handleSave}>
        <Input
          variant="form"
          size="lg"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('settings.displayName')}
          aria-label={t('settings.displayName')}
          error={error}
        />
        <Button
          intent="accent"
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          data-testid="settings-profile-save-display-name"
        >
          {t('settings.save')}
        </Button>
      </form>

      {saved && !error && (
        <p
          role="status"
          aria-live="polite"
          data-testid="settings-profile-success"
          className="text-[var(--font-size-meta)] text-[var(--color-signal-success)]"
        >
          {t('settings.profile.saved')}
        </p>
      )}
    </div>
  );
}
