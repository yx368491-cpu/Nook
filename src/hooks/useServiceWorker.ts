import { Workbox } from 'workbox-window';
import { env } from '@/config/env';

/**
 * M5-2 — Service Worker register call (F-MEDIA-01 / AC.17).
 *
 * Refactored from a hook to a plain function after code-review caught
 * a React hook-rule violation: the original `useServiceWorkerRegister`
 * used `useEffect` and was being called at module top-level in
 * `main.tsx`, which fires outside the React tree and crashes with
 * "Invalid hook call..." on app boot.
 *
 * The hook signature was incidental — the only stateful behavior is
 * "fire-and-forget the register call exactly once, gated on env".
 * Converting to a plain function removes the dependency on React's
 * lifetime entirely (we'd otherwise need a hidden `<Boot />` component
 * inside the React tree, which is more code for the same effect).
 *
 * Gates:
 *   1. `import.meta.env.PROD` must be true. Dev-mode SW shadows HMR.
 *   2. `env.enableSw` (parsed from `VITE_ENABLE_SW === 'true'`) must
 *      be true. Deploy opt-in so an emergency rollback can disable
 *      the SW without a code change.
 *   3. `navigator.serviceWorker` must exist. SSR-safe + ancient
 *      browser guard.
 *
 * Module-level singleton: `_registerOnce` ensures the Workbox
 * instance is created exactly once per app boot, regardless of who's
 * calling us (StrictMode double-mounts a Boot component, App re-renders
 * due to provider chain swaps, etc.). Without this guard, a second
 * mount would issue a redundant `wb.register()` call against an
 * already-installed SW, which is harmless on the server side but
 * doubles install time + log noise.
 *
 * Update strategy: `autoUpdate` via vite-plugin-pwa. New SW bundles
 * take over on next page load; the prior SW is asked to skipWaiting
 * and the new SW activates immediately. This matches the SPEC
 * "AC.AC.pwa" criterion that the page must be installable +
 * upgradable without a manual "refresh to update" prompt.
 *
 * Reduced-motion: this function has no motion surface; it only emits
 * console messages. UI consumers (Composer yellow dot, future
 * reconnecting strip) are responsible for honoring
 * `prefers-reduced-motion` independently.
 *
 * Boundary discipline:
 *   - Does NOT touch the outbox / Dexie. The Dexie layer is the
 *     user-visible state machine (yellow dot, reconnecting strip).
 *     Workbox BG sync is a parallel HTTP-level retry fence; the two
 *     layers cooperate via server-side `client_msg_id` dedupe.
 *   - Does NOT expose status through React state — no real
 *     consumer needs it today. Reassess when M7-7 PWA install banner
 *     is wired (will probably want `ww_installable` status).
 */

let _registerOnce: boolean = false;

export function registerServiceWorkerOnce(): void {
  // Gate (1): production env. Gate (2): explicit opt-in flag.
  if (!import.meta.env.PROD) {
    console.info(
      '[nook/sw] SKIP register: not production env (dev-mode HMR protection)',
    );
    return;
  }
  if (!env.enableSw) {
    console.info(
      '[nook/sw] SKIP register: VITE_ENABLE_SW is not "true" (deploy opt-in required)',
    );
    return;
  }
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !navigator.serviceWorker
  ) {
    // SSR-safe + ancient-browser guard. The triple check catches:
    //   1. `window` absent (SSR workers, Deno target)
    //   2. No SW API at all (IE11, very old Android)
    //   3. Property defined but value `undefined` / `null` (jsdom
    //      test environments where the stub is set via
    //      `Object.defineProperty(..., { value: undefined })` —
    //      `'serviceWorker' in navigator` is still true here, so
    //      the property-existence check alone is insufficient).
    console.warn('[nook/sw] SKIP register: navigator.serviceWorker absent');
    return;
  }
  // Singleton guard — fires the register call at most once per
  // module load. Subsequent invocations are no-ops regardless of
  // caller (boot component remount, StrictMode double-mount, etc.).
  if (_registerOnce) return;
  _registerOnce = true;

  const wb = new Workbox('/sw.js', { scope: '/' });

  wb.addEventListener('installed', () => {
    console.info('[nook/sw] installed');
  });
  wb.addEventListener('waiting', () => {
    console.info('[nook/sw] waiting (new SW pending; will activate on next reload)');
  });
  wb.addEventListener('controlling', () => {
    console.info('[nook/sw] controlling — new SW took over the page');
  });
  wb.addEventListener('activated', () => {
    console.info('[nook/sw] activated');
  });

  wb.register()
    .then((reg: ServiceWorkerRegistration | undefined) => {
      console.info('[nook/sw] register ok', { scope: reg?.scope ?? '<unknown>' });
    })
    .catch((err: unknown) => {
      console.error('[nook/sw] register FAILED', err);
      // Reset singleton so a retry path (manual "reload to retry")
      // can pass through without a rebuild.
      _registerOnce = false;
    });
}

// ----------------------------------------------------------------------------
// Test-only hooks (reset for vitest isolation). NOT exported from the
// barrel — keep internal so production code can't accidentally call.
// ----------------------------------------------------------------------------

/**
 * @internal — exported only so tests can flip `_registerOnce` between
 * cases. Has no production caller.
 */
export function __resetServiceWorkerRegisterOnce(): void {
  _registerOnce = false;
}
