/// <reference types="vite/client" />

interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appVersion: string;
  sentryDsn: string;
  logsnagToken: string;
  /**
   * M5-2 — explicitly opt into Service Worker background sync. Defaults
   * to `'false'` in dev so first-load HMR isn't shadowed by the SW +
   * BG sync queue. Production builds should set this to `'true'` in
   * the deploy environment (Cloudflare Pages env vars) before shipping
   * a non-trivial install base. Mirrors F-MEDIA-01 / AC.17's "send
   * message offline" promise: without a registered SW there is no
   * Workbox BG sync replay, so the outbox UI stripe is purely the
   * client-side state machine (no SW-side retry).
   */
  enableSw: boolean;
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

function getEnv(): Env {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    appVersion: import.meta.env.VITE_APP_VERSION ?? '0.0.0',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
    logsnagToken: import.meta.env.VITE_LOGSNAG_TOKEN ?? '',
    enableSw: isTruthyEnvFlag(import.meta.env.VITE_ENABLE_SW),
  };
}

export const env = getEnv();
