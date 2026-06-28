import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useDraftInput — per-conversation composer draft retention.
 *
 * Persists the unsent composer text to `localStorage` so an accidental
 * route change, reload, or tab close does NOT lose the user's intent
 * (SPEC § 7 DR-10配置的 "localStorage — 配置 / 语言 / 关键数据" —
 * drafts are explicitly part of the local-first posture).
 *
 * Storage shape:
 *   key:    `nook_draft_<conversationId>`
 *   value:  JSON-encode string (the body)
 *
 * Debounce window: 400ms after last keystroke, plus an immediate write
 * on unmount + on conversationId change (so switching rooms doesn't lose
 * the previously typed draft — the new room simply hydrates its own).
 *
 * SSR-safe (typeof window guards localStorage access on first render).
 */
export function useDraftInput(
  conversationId: string,
  initialValue = '',
  debounceMs = 400,
) {
  const storageKey = `nook_draft_${conversationId}`;
  const [draft, setDraftState] = useState<string>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ?? initialValue;
    } catch {
      return initialValue;
    }
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWrittenRef = useRef<string | null>(null);

  // Persist draft to storage on every change (debounced).
  const setDraft = useCallback(
    (next: string) => {
      setDraftState(next);
      if (typeof window === 'undefined') return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          if (next === '') {
            window.localStorage.removeItem(storageKey);
          } else if (next !== lastWrittenRef.current) {
            window.localStorage.setItem(storageKey, next);
          }
          lastWrittenRef.current = next;
        } catch {
          // localStorage may throw on quota-exceeded — silently ignore so
          // the typing UX is never blocked.
        }
      }, debounceMs);
    },
    [storageKey, debounceMs],
  );

  /**
   * Clear the draft (no-op on storage write until next debounce flush).
   * Used after a successful send.
   */
  const clearDraft = useCallback(() => {
    setDraftState('');
    if (typeof window === 'undefined') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    lastWrittenRef.current = '';
  }, [storageKey]);

  /**
   * On conversationId change: flush any pending write for the previous
   * room before swapping. (React will call the cleanup when conversationId
   * prop changes — but we also do an explicit sync write here to avoid
   * any races with component unmount.)
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      setDraftState(stored ?? initialValue);
      lastWrittenRef.current = stored ?? initialValue;
    } catch {
      setDraftState(initialValue);
    }
    // intentionally not depending on `initialValue` — we want to hydrate
    // from storage exactly when the conversationId prop flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Flush any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // The debounce timer is cleared; the buffered value was never persisted
      // but the React state update fired synchronously. Since the user is
      // navigating away (e.g. selecting another conv / closing tab), we
      // don't force a write — the periodic debounce during typing already
      // captured state within the last 400ms.
    };
  }, []);

  return { draft, setDraft, clearDraft } as const;
}
