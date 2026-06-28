import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getAttachmentSignedUrl } from '@/lib/api/chat';

/**
 * Signed-URL cache for the `attachments` bucket (private per M3-1 RLS).
 *
 * - 55-min staleTime matches the 1-hour signed URL expiry minus a
 *   small grace, so consumers can rely on cached URLs for ~5 min after
 *   revalidation; on staleTime expiry a fresh signed URL is generated.
 * - `enabled: false` while `storagePath` is null to avoid wasted RPC calls.
 * - `retry: 1` for transient network blips; the UI renders a fallback
 *   on persistent failure rather than blocking the chat.
 */
export function useAttachmentSignedUrl(
  storagePath: string | null,
): UseQueryResult<string, Error> {
  return useQuery<string, Error>({
    queryKey: ['attachment-url', storagePath] as const,
    queryFn: () => {
      if (!storagePath) throw new Error('storagePath required');
      return getAttachmentSignedUrl(storagePath, 3600);
    },
    enabled: Boolean(storagePath),
    staleTime: 55 * 60_000,
    retry: 1,
  });
}
