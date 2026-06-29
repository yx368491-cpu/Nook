/**
 * M5-7 — useFileUploadProgress hook.
 *
 * Owns the `AbortController` + progress state + cancellation lifecycle
 * for an active file upload. Pure local component state — no React
 * Query, no SW, no network side effects. Composer attaches the
 * returned `onProgress` callback + `signal` (AbortSignal) to the
 * `useSendAttachmentMessage` mutation which then forwards them to
 * `uploadAttachment(file, convId, { withProgress: true })`.
 *
 * Lifecycle (calls Composer makes):
 *
 *   const { state, isUploading, start, cancel, reset } = useFileUploadProgress();
 *   const { onProgress, signal } = start(file);   // before await
 *   try {
 *     await sendAttachM.mutateAsync({ file, kind, ..., onProgress, signal });
 *   } catch (e) {
 *     if (e.code !== 'CANCELLED') setError({ message: ... });
 *   } finally {
 *     reset();   // always clear UI on completion (no abort)
 *   }
 *
 * `cancel()` aborts the XHR mid-flight, triggering the React Query
 * mutation's onError path with `{ code: 'CANCELLED', ... }`. Composer
 * detects the code in dispatchFile's catch block and SILENTLY skips
 * the error strip — cancellations are user-intended, not failures.
 *
 * Design notes (Decision 2 of M5-7 architecture):
 *   - We do NOT best-effort delete the partial storage object on
 *     cancel; pg_cron J-01 (migration 0006) reaps orphans within ~24h.
 *     v1.1 may want an immediate `storage.remove([path])` call.
 *   - `reset()` clears state without aborting, used in the dispatchFile
 *     `finally` block to clear the progress UI on completion
 *     (success OR validation-rejection OR upload-failed).
 *   - Component unmount aborts any in-flight upload (router-driven
 *     unmount path), preventing zombie XHRs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface FileUploadProgressState {
  /** Bytes uploaded so far. */
  loaded: number;
  /** Total bytes to upload (= `file.size` at start time). */
  total: number;
  /** File name displayed next to the progress percentage. */
  fileName: string;
}

export interface UseFileUploadProgressReturn {
  /** `null` when no upload is in flight. */
  state: FileUploadProgressState | null;
  /** Convenience boolean: `state !== null`. */
  isUploading: boolean;
  /**
   * Begin tracking a new upload. Aborts any prior in-flight upload
   * before arming the new one (last-write-wins on rapid picks).
   * Returns `{ onProgress, signal }` to thread through the mutation.
   */
  start: (file: File) => {
    onProgress: (loaded: number, total: number) => void;
    signal: AbortSignal;
  };
  /**
   * Abort the in-flight upload. Sets the AbortSignal that the XHR
   * helper is listening to; the helper's `onabort` fires and rejects
   * with `{ code: 'CANCELLED' }`. State is cleared.
   */
  cancel: () => void;
  /**
   * Clear progress state without aborting the in-flight upload. Use
   * this in `finally` blocks to hide the UI when control returns from
   * the upload call (success OR error). Safe to call before any upload
   * started (no-op).
   */
  reset: () => void;
}

export function useFileUploadProgress(): UseFileUploadProgressReturn {
  const [state, setState] = useState<FileUploadProgressState | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback((file: File) => {
    // Last-write-wins: a rapid second pick/drop cancels the first
    // upload's in-flight AbortController. The mutation's onError will
    // surface the rejection but Composer swallows CANCELLED codes.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ loaded: 0, total: file.size, fileName: file.name });
    return {
      onProgress: (loaded: number, total: number) => {
        if (controller.signal.aborted) return;
        setState((prev) =>
          prev ? { ...prev, loaded, total } : null,
        );
      },
      signal: controller.signal,
    };
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(null);
  }, []);

  const reset = useCallback(() => {
    setState(null);
  }, []);

  // Cleanup on unmount — abort any in-flight XHR whose component is
  // no longer mounted. Router-driven unmounts (navigate away mid-upload)
  // would otherwise leave zombie XHRs tying up network bandwidth.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  return {
    state,
    isUploading: state !== null,
    start,
    cancel,
    reset,
  };
}
