import { useTranslation } from 'react-i18next';
import { Bubble } from '@/components/ui/Bubble';
import { useAttachmentSignedUrl } from '@/hooks/useAttachmentUrl';

interface AttachmentImageProps {
  storagePath: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * Image bubble with on-demand signed URL + loading skeleton.
 *
 * - Skeleton uses stored DB width/height as a placeholder so the bubble
 *   doesn't reflow when the image arrives (F-MSG-02 + §6.1 ARCH).
 * - Signed URL cached 55 min via `useAttachmentSignedUrl`.
 * - On error the UI shows a localized fallback inside the bubble so the
 *   surrounding chat layout is preserved.
 */
export function AttachmentImage({
  storagePath,
  alt,
  width,
  height,
}: AttachmentImageProps) {
  const { t } = useTranslation();
  const { data: url, isLoading, isError } = useAttachmentSignedUrl(storagePath);

  // Cap the visual footprint so a giant source image doesn't blow up a row
  const safeWidth = Math.min(Math.max(width, 80), 480);
  const safeHeight = Math.min(Math.max(height, 80), 480);

  if (isLoading) {
    return (
      <div
        role="presentation"
        aria-busy="true"
        className="rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] animate-pulse"
        style={{ width: `${safeWidth}px`, height: `${safeHeight}px` }}
      />
    );
  }

  if (isError || !url) {
    return (
      <span className="italic text-[var(--color-ink-muted)] text-[var(--font-size-meta)]">
        {t('messages.imageLoadFailed')}
      </span>
    );
  }

  return (
    <Bubble.Image
      src={url}
      alt={alt || t('chat.imageAlt')}
      width={safeWidth}
      height={safeHeight}
    />
  );
}
