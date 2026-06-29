/**
 * Nook M5-6 · SettingsProfilePage `<AvatarPicker>`.
 *
 * UX:
 *   1. User clicks [Pick avatar] → hidden file input fires.
 *   2. Client preflight validates (size + MIME + ext) — error inline if fail.
 *   3. `URL.createObjectURL` produces a local preview; meanwhile `detectExif`
 *      shows an informational 6-second auto-dismissing warning per M5-5.
 *   4. User clicks [Save avatar] → `useAuth.uploadAvatar(file)` writes to
 *      `avatars/<uid>/avatar-<ts>.<ext>`, PATCHes `profiles.avatar_url`, and
 *      updates the store so all `<Avatar>` consumers re-render.
 *   5. [Remove avatar] → PATCH `avatar_url:null` + best-effort storage purge.
 *   6. [Cancel] discards preview without commit.
 *
 * Lifecycle hygiene:
 *   - URL.createObjectURL is revoked on unmount + on save success + on cancel.
 *   - EXIF warning timer (`exifTimerRef`) cleared on unmount AND on cancel.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  AVATAR_ALLOWED_MIMES,
  AVATAR_MAX_BYTES,
  AvatarValidationError,
  validateAvatarFile,
} from '@/lib/api/profile';
import { detectExif, type ExifDetectionResult } from '@/lib/storage/exif';
import { useAuth } from '@/stores/useAuth';

const EXIF_WARNING_DISMISS_MS = 6000;

export function AvatarPicker() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const session = useAuth((s) => s.session);
  const uploadAvatarFn = useAuth((s) => s.uploadAvatar);
  const deleteAvatarFn = useAuth((s) => s.deleteAvatar);
  const isUploadingAvatar = useAuth((s) => s.isUploadingAvatar);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exifWarning, setExifWarning] = useState<boolean>(false);

  const userId = session?.user.id ?? profile?.id ?? null;
  const displayName = profile?.displayName ?? '';
  const accept = AVATAR_ALLOWED_MIMES.join(',');

  // Lifecycle: revoke preview URL + clear EXIF timer on unmount.
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (exifTimerRef.current !== null) {
        clearTimeout(exifTimerRef.current);
        exifTimerRef.current = null;
      }
    },
    // previewUrl intentionally listed so unmount after a stale preview also revokes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewUrl],
  );

  const resetPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setExifWarning(false);
    if (exifTimerRef.current !== null) {
      clearTimeout(exifTimerRef.current);
      exifTimerRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onPick = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setExifWarning(false);

    // Client-side preflight (defense in depth — bucket also enforces).
    try {
      validateAvatarFile(file);
    } catch (err) {
      const code = (err as AvatarValidationError).code;
      let message: string;
      switch (code) {
        case 'empty':
          message = t('settings.avatar.errors.empty');
          break;
        case 'too_large':
          message = t('settings.avatar.errors.tooLarge', {
            size: AVATAR_MAX_BYTES / 1024 / 1024,
          });
          break;
        case 'unsupported_ext':
          message = t('settings.avatar.errors.unsupportedExt');
          break;
        case 'unsupported_mime':
        default:
          message = t('settings.avatar.errors.unsupportedMime');
          break;
      }
      setError(message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Local blob preview via URL.createObjectURL.
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // M5-5-derived informational EXIF detection (read-not-write per R-30).
    try {
      const result: ExifDetectionResult = await detectExif(file);
      if (result.hasExif) {
        setExifWarning(true);
        if (exifTimerRef.current !== null) clearTimeout(exifTimerRef.current);
        exifTimerRef.current = setTimeout(() => {
          setExifWarning(false);
          exifTimerRef.current = null;
        }, EXIF_WARNING_DISMISS_MS);
      }
    } catch {
      // detectExif contractually self-resolves; defensive no-op.
    }
  };

  const onSave = async () => {
    if (!userId) {
      setError(t('errors.unauthorized'));
      return;
    }
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t('settings.avatar.errors.empty'));
      return;
    }
    try {
      await uploadAvatarFn(file);
      resetPreview();
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : t('settings.avatar.errors.uploadFailed');
      setError(msg);
    }
  };

  const onRemove = async () => {
    if (!userId) {
      setError(t('errors.unauthorized'));
      return;
    }
    try {
      await deleteAvatarFn();
      resetPreview();
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : t('settings.avatar.errors.deleteFailed');
      setError(msg);
    }
  };

  const srcUrl = previewUrl ?? profile?.avatarUrl ?? null;
  const dirty = previewUrl !== null;
  const hasAvatar =
    srcUrl !== null && (profile?.avatarUrl !== null || previewUrl !== null);

  return (
    <section
      className="flex flex-col gap-[var(--space-md)]"
      data-testid="avatar-picker"
      aria-label={t('settings.avatar.sectionLabel')}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onFileChange}
        data-testid="avatar-picker-input"
      />

      <div className="flex items-center gap-[var(--space-lg)]">
        <Avatar name={displayName} src={srcUrl} size="lg" />
        <div className="flex flex-col gap-[var(--space-sm)]">
          <Button
            intent="neutral"
            size="md"
            onClick={onPick}
            disabled={isUploadingAvatar}
            data-testid="avatar-picker-pick"
          >
            {t('settings.avatar.upload')}
          </Button>
          <Button
            intent="danger"
            size="md"
            onClick={onRemove}
            disabled={isUploadingAvatar || !hasAvatar}
            data-testid="avatar-picker-remove"
          >
            {t('settings.avatar.remove')}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="flex items-center gap-[var(--space-sm)]">
          <Button
            intent="accent"
            size="md"
            onClick={onSave}
            disabled={isUploadingAvatar}
            loading={isUploadingAvatar}
            data-testid="avatar-picker-save"
          >
            {t('settings.avatar.save')}
          </Button>
          <Button
            intent="neutral"
            size="md"
            onClick={resetPreview}
            disabled={isUploadingAvatar}
            data-testid="avatar-picker-cancel"
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {exifWarning && (
        <p
          role="status"
          aria-live="polite"
          data-testid="avatar-picker-exif-warning"
          className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--font-size-meta)] text-[var(--color-signal-warning)] bg-[var(--color-signal-warning-soft)] border border-[var(--color-signal-warning)] rounded-[var(--radius-md)] flex items-center gap-[var(--space-sm)]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 1L15 14H1L8 1Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M8 6v4M8 11.5v.01"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>{t('chat.exifWarning.body')}</span>
        </p>
      )}

      {error && (
        <p
          role="alert"
          data-testid="avatar-picker-error"
          className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--font-size-meta)] text-[var(--color-signal-error)]"
        >
          {error}
        </p>
      )}
    </section>
  );
}
