/**
 * Integration Test Setup for M2-3 friend-signup EF + M2-4 RPC
 *
 * Configures Supabase credentials for the integration tests.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ Key resolution strategy                                     │
 * ├──────────────────────────────────────────────────────────────┤
 * │ Vite/Vitest automatically loads `.env` into `process.env`. │
 * │ The project's `.env` contains CLOUD credentials (intentional │
 * │ for `npm run dev` against hosted Supabase). When integration │
 * │ tests run against the LOCAL Supabase instance, those cloud  │
 * │ keys are signed by a different JWT secret — GoTrue admin    │
 * │ rejects them with 401 "no_authorization".                   │
 * │                                                               │
 * │ Fix: in non-CI mode, the dynamic `supabase status -o env`   │
 * │ output is the source of truth, completely overriding any    │
 * │ values from `process.env`. CI mode keeps the original       │
 * │ behavior (env-var override) since CI provides explicit keys.│
 * │                                                               │
 * │ Auto-detected "key format" is informational only:           │
 * │ `supabase status -o env` always emits legacy JWT format for │
 * │ ANON_KEY + SERVICE_ROLE_KEY (regardless of CLI version).    │
 * │ New sb_publishable_/sb_secret_ keys appear as PUBLISHABLE_  │
 * │ KEY / SECRET_KEY and are NOT used here.                     │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Run: `npm run test:integration` after `supabase start`.
 * Skip everything with `SKIP_INTEGRATION_TESTS=true`.
 * Skip only EF tests with `SKIP_EF_TESTS=true`.
 */

import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';

// ── CI detection ──────────────────────────────────────────────
// Explicit CI detection; if any signal is set, we trust process.env.
// For LOCAL dev (no CI), we ALWAYS prefer `supabase status -o env`
// to bypass .env cloud credentials loaded by Vite/Vitest.

const IS_CI =
  process.env.CI === 'true' ||
  process.env.GITHUB_ACTIONS === 'true' ||
  process.env.GITLAB_CI === 'true' ||
  process.env.CIRCLECI === 'true' ||
  process.env.BUILDKITE === 'true';

// ── Local key resolution ──────────────────────────────────────

/**
 * Parse `supabase status -o env` output. Format: `KEY="value"` per line.
 * Returns empty object on any failure so callers fall through to defaults.
 */
function parseSupabaseStatusEnv(out: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const line of out.split('\n')) {
    const m = line.match(/^([A-Z_]+)="([^"]*)"$/);
    if (m) parsed[m[1]] = m[2];
  }
  return parsed;
}

/**
 * Invoke the locally-installed `supabase` CLI to read live keys.
 * NOTE: We invoke `supabase` (not `npx supabase`) because on Windows
 * the npm `supabase` package has NO win32-x64 binary → "no matching
 * CLI binary" error. The locally-installed CLI works on all platforms.
 */
function readSupabaseStatus(): Record<string, string> {
  if (IS_CI) return {};

  try {
    const out = execSync('supabase status -o env', {
      encoding: 'utf8',
      timeout: 5_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = parseSupabaseStatusEnv(out);
    if (Object.keys(parsed).length > 0) {
      console.info(
        `✓ Loaded ${Object.keys(parsed).length} env vars from local Supabase ` +
          `(API_URL=${parsed.API_URL ? '<set>' : '<missing>'}, ` +
          `ANON_KEY=${parsed.ANON_KEY ? '<set>' : '<missing>'}, ` +
          `SERVICE_ROLE_KEY=${parsed.SERVICE_ROLE_KEY ? '<set>' : '<missing>'})`,
      );
    } else {
      console.warn('⚠️  `supabase status -o env` returned no keys.');
    }
    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `⚠️  Could not run \`supabase status -o env\`: ${msg}\n` +
        '   Falling back to process.env (likely cloud keys from .env).',
    );
    return {};
  }
}

// ── Local & CI resolution paths ───────────────────────────────

// Legacy hardcoded JWT default — only used if both dynamic fetch AND
// process.env are unavailable (truly desperate fallback).
const DEFAULT_LEGACY_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const DEFAULT_LEGACY_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJZDJ1M5HjR1s4Jx3sXaM1GdI6y7B0I';

const localStatus = readSupabaseStatus();

// ── Configuration constants ───────────────────────────────────

/**
 * Supabase URL.
 * - Local (non-CI): dynamic status > hardcoded local-dev URL
 * - CI: env var > hardcoded local-dev URL
 */
export const SUPABASE_LOCAL_URL = IS_CI
  ? process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
  : localStatus.API_URL ?? 'http://127.0.0.1:54321';

export const EF_URL = `${SUPABASE_LOCAL_URL}/functions/v1/friend-signup`;

/**
 * Anon key.
 * - Local (non-CI): dynamic status (NEVER process.env — that has cloud creds from .env)
 * - CI: env var > legacy fallback
 */
export const SUPABASE_ANON_KEY = IS_CI
  ? process.env.SUPABASE_ANON_KEY ?? DEFAULT_LEGACY_ANON_KEY
  : localStatus.ANON_KEY ?? DEFAULT_LEGACY_ANON_KEY;

/**
 * Service-role key.
 * - Local (non-CI): dynamic status (NEVER process.env — that has cloud creds from .env)
 * - CI: env var > legacy fallback
 */
export const SUPABASE_SERVICE_ROLE_KEY = IS_CI
  ? process.env.SUPABASE_SERVICE_ROLE_KEY ?? DEFAULT_LEGACY_SERVICE_ROLE_KEY
  : localStatus.SERVICE_ROLE_KEY ?? DEFAULT_LEGACY_SERVICE_ROLE_KEY;

/** True if both resolved keys are the new `sb_publishable_/sb_secret_` format */
export const IS_NEW_KEY_FORMAT =
  SUPABASE_ANON_KEY.startsWith('sb_publishable_') &&
  SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_');

/**
 * Build the standard Supabase header set for any HTTP call.
 * Always sends BOTH `apikey` AND `Authorization: Bearer` so it works
 * with both legacy JWT and new `sb_publishable_` keys.
 */
export function supabaseHeaders(
  key: string = SUPABASE_ANON_KEY,
  extras: Record<string, string> = {},
): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extras,
  };
}

// ── Suite-level skip guards ───────────────────────────────────

export const SKIP_INTEGRATION_TESTS = process.env.SKIP_INTEGRATION_TESTS === 'true';
export const SKIP_EF_TESTS =
  process.env.SKIP_EF_TESTS === 'true' ||
  process.env.SKIP_INTEGRATION_TESTS === 'true';

// ── Time/format constants ─────────────────────────────────────

export const INVITE_EXPIRY_HOURS = 24;
export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MAX_LENGTH = 40;

/** Email domains for test isolation */
const TEST_DOMAIN = 'nook-test.example';

let _isSupabaseAvailable: boolean | null = null;

export async function isSupabaseAvailable(): Promise<boolean> {
  if (_isSupabaseAvailable !== null) return _isSupabaseAvailable;

  try {
    const res = await fetch(`${SUPABASE_LOCAL_URL}/rest/v1/`, {
      headers: supabaseHeaders(),
      signal: AbortSignal.timeout(3000),
    });
    _isSupabaseAvailable = res.ok || res.status === 401;
  } catch {
    _isSupabaseAvailable = false;
  }

  return _isSupabaseAvailable;
}

export async function isEdgeFunctionAvailable(): Promise<boolean> {
  try {
    const res = await fetch(EF_URL, {
      method: 'POST',
      headers: supabaseHeaders(SUPABASE_ANON_KEY, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ invite_token: '__healthcheck__' }),
      signal: AbortSignal.timeout(3000),
    });
    return res.status > 0;
  } catch {
    return false;
  }
}

let emailCounter = Date.now();
export function generateTestEmail(prefix = 'friend'): string {
  emailCounter += 1;
  return `${prefix}-signup-${emailCounter}@${TEST_DOMAIN}`;
}

export function generateTestToken(): string {
  const chars = 'abcdef0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// ── Global hooks ──────────────────────────────────────────────

beforeAll(async () => {
  const available = await isSupabaseAvailable();
  if (!available) {
    console.warn(
      '\n⚠️  Supabase local dev is not reachable. Integration tests will fail.\n' +
        '   Run `supabase start` first. Or set SKIP_INTEGRATION_TESTS=true to skip.\n',
    );
  } else {
    const fmt = IS_NEW_KEY_FORMAT ? 'sb_publishable_/sb_secret_' : 'legacy JWT';
    console.info(`✓ Supabase reachable at ${SUPABASE_LOCAL_URL} (${fmt})`);
  }

  if (!SKIP_EF_TESTS) {
    const efUp = await isEdgeFunctionAvailable();
    if (!efUp) {
      console.warn(
        '\n⚠️  friend-signup EF is NOT served.\n' +
          '   Run `supabase functions serve friend-signup --no-verify-jwt` first.\n' +
          '   Set SKIP_EF_TESTS=true to skip just the EF HTTP tests.\n',
      );
    }
  }
});

afterAll(async () => {
  _isSupabaseAvailable = null;
});
