import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bubble } from '@/components/ui/Bubble';
import { useAttachmentSignedUrl } from '@/hooks/useAttachmentUrl';
// M5-4 — local blob cache reader. Returns a `blob:` URL when the
// image is cached locally; otherwise null and the caller falls
// through to the signed URL path. We also call `touchAttachment`
// on each cache HIT so the LRU eviction correctly preserves
// recently-viewed blobs over stale ones (without this, every
// blob shares `lastAccessedAt === createdAt` and the LRU order is
// non-deterministic — common production bug we caught at Round-3
// review).
import {
  getAttachmentCacheRow,
  touchAttachment,
} from '@/lib/db/attachments';

interface AttachmentImageProps {
  storagePath: string;
  /**
   * M5-4 — server `attachments.id` (UUID v4). Used as the Dexie
   * PK for the local blob cache. If present AND the cache HITS,
   * the bubble hydrates from `blob:` URL with zero network. Otherwise
   * the prop falls through to the existing signed-URL fetch path.
   */
  attachmentId?: string | null;
  alt: string;
  width: number;
  height: number;
}

/**
 * Image bubble with on-demand signed URL + loading skeleton.
 *
 * - M5-4 — when `attachmentId` is provided AND the Dexie local blob
 *   cache has the row, render directly from `blob:` URL (zero
 *   network round-trip). The signed URL is fetched only on a cache
 *   miss.
 * - Skeleton uses stored DB width/height as a placeholder so the bubble
 *   doesn't reflow when the image arrives (F-MSG-02 + §6.1 ARCH).
 * - Signed URL cached 55 min via `useAttachmentSignedUrl`.
 * - On error the UI shows a localized fallback inside the bubble so the
 *   surrounding chat layout is preserved.
 */
export function AttachmentImage({
  storagePath,
  attachmentId,
  alt,
  width,
  height,
}: AttachmentImageProps) {
  const { t } = useTranslation();
  const { data: signedUrl, isLoading, isError } = useAttachmentSignedUrl(storagePath);

  // M5-4 — local blob cache hydration. We deliberately use a plain
  // useState (not `useLiveQuery`) so the consumer doesn't re-render
  // on every Dexie write — only when THIS image's row changes. The
  // `attachmentId` dependency is the only meaningful change signal.
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!attachmentId) {
      setBlobUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const row = await getAttachmentCacheRow(attachmentId);
      if (cancelled) return;
      if (!row) {
        setBlobUrl(null);
        return;
      }
      // Build a fresh `blob:` URL per visit and revoke the previous
      // one to keep Blob refs from leaking past the consumer's
      // lifetime.
      const fresh = URL.createObjectURL(row.blob);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return fresh;
      });
    })();
    return () => {
      cancelled = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [attachmentId]);

  // LRU touch — bumped on each successful cache resolution. Fire-
  // and-forget: a thrown reject inside `touchAttachment` (e.g. IDB
  // contention with a parallel purge) shouldn't block render. The
  // bump is sequential with the blob URL update above; consumers
  // shouldn't observe mid-touch inconsistency because the blob URL
  // is local component state, not derived from the row.
  useEffect(() => {
    if (!attachmentId || !blobUrl) return;
    void touchAttachment(attachmentId).catch((err: unknown) => {
      console.warn('[nook/attachments] touchAttachment failed', err);
    });
  }, [attachmentId, blobUrl]);

  // Cap the visual footprint so a giant source image doesn't blow up a row
  const safeWidth = Math.min(Math.max(width, 80), 480);
  const safeHeight = Math.min(Math.max(height, 80), 480);

  // M5-4 cache HIT — render directly from blob: URL.
  if (blobUrl) {
    return (
      <Bubble.Image
        src={blobUrl}
        alt={alt || t('chat.imageAlt')}
        width={safeWidth}
        height={safeHeight}
      />
    );
  }

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

  if (isError || !signedUrl) {
    return (
      <span className="italic text-[var(--color-ink-muted)] text-[var(--font-size-meta)]">
        {t('messages.imageLoadFailed')}
      </span>
    );
  }

  return (
    <Bubble.Image
      src={signedUrl}
      alt={alt || t('chat.imageAlt')}
      width={safeWidth}
      height={safeHeight}
    />
  );
}
