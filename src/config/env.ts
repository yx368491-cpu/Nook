/// <reference types="vite/client" />

interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appVersion: string;
  sentryDsn: string;
  logsnagToken: string;
}

function getEnv(): Env {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    appVersion: import.meta.env.VITE_APP_VERSION ?? '0.0.0',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
    logsnagToken: import.meta.env.VITE_LOGSNAG_TOKEN ?? '',
  };
}

export const env = getEnv();
