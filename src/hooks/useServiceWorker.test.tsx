import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  registerServiceWorkerOnce,
  __resetServiceWorkerRegisterOnce,
} from './useServiceWorker';

/**
 * M5-2 — verify production + VITE_ENABLE_SW + navigator.serviceWorker gating.
 *
 * The implementation shipped a plain function `registerServiceWorkerOnce`
 * (NOT a React hook) after the v1 candidate was caught calling
 * `useServiceWorkerRegister` from `main.tsx`, which violates React's
 * hook-call rules (no React tree context outside a component render).
 *
 * Test strategy:
 *   - Mock `workbox-window` so we can introspect the `Workbox`
 *     constructor + `register()` calls without bringing a real SW
 *     runtime into jsdom.
 *   - Swap `@/config/env`'s `enableSw` getter per test via a
 *     module-level mock so the env-flag branch is exercised.
 *   - Stub `navigator.serviceWorker` so the third gate
 *     (`'serviceWorker' in navigator`) can fire on the happy path.
 *   - Reset the module-level `_registerOnce` singleton between tests so
 *     idempotency assertions are EXACTLY between two fresh call sites.
 */

// -----------------------------------------------------------------------------
// Module-level mocks
// -----------------------------------------------------------------------------

const workboxCtor = vi.fn();
const workboxRegister = vi.fn();

vi.mock('workbox-window', () => {
  // Use a CLASS declaration so `new Workbox()` is GUARANTEED to
  // return an instance with the lifecycle methods regardless of
  // vitest's vi.fn + constructor-call internals. Class declarations
  // have unambiguous `new` semantics: `this` IS the constructed
  // instance, no `Object.assign(this, ...)` workaround needed, no
  // `this:` TS parameter needed (so no TS2683 implicit-any).
  //
  // The earlier `vi.fn().mockImplementation(function() { ... this.x
  // = ... })` round was relying on `this` being the constructed
  // object, but vitest's MockFunction intercepts `new` calls and
  // returns the MockFunction instance itself — producing
  // `wb.addEventListener is not a function` errors downstream. The
  // class form sidesteps this entirely.
  class WorkboxMock {
    // `declare` skips the implicit class-field initializer requirement
    // (we assign in the constructor). Without `declare`, TS narrows the
    // field's type to undefined per the strict class-fields baseline,
    // and assignment in the constructor is rejected with TS2339.
    declare addEventListener: ReturnType<typeof vi.fn>;
    declare register: ReturnType<typeof vi.fn>;
    constructor(url: string, options?: unknown) {
      workboxCtor(url, options);
      this.addEventListener = vi.fn();
      this.register = workboxRegister;
    }
  }
  return { Workbox: WorkboxMock };
});

// Per-test enableSw mock — the env module is imported at module-load
// time; using a getter ensures the change made by each test's first
// `mockEnableSw = true` is observed at function-call time (not just
// `vi.mock` factory time, which is hoisted to module-load top).
let mockEnableSw = false;
vi.mock('@/config/env', () => ({
  get env() {
    return { enableSw: mockEnableSw };
  },
}));

function stubServiceWorker(present: boolean) {
  if (present) {
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: {} as ServiceWorkerContainer,
      configurable: true,
    });
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  workboxCtor.mockClear();
  workboxRegister.mockReset();
  workboxRegister.mockResolvedValue({ scope: '/' });
  mockEnableSw = false;
  stubServiceWorker(true);
  // CRITICAL — the implementation caches a `_registerOnce` boolean at
  // module scope so the Workbox instance is created exactly once per
  // boot. Without resetting, the second test would see the singleton
  // already set and silently skip its register call (false positive).
  __resetServiceWorkerRegisterOnce();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('registerServiceWorkerOnce — gating logic', () => {
  it('does NOT construct Workbox in dev (PROD=false)', () => {
    vi.stubEnv('PROD', false);
    mockEnableSw = true; // even if env flag is on, dev must skip
    registerServiceWorkerOnce();
    expect(workboxCtor).not.toHaveBeenCalled();
    expect(workboxRegister).not.toHaveBeenCalled();
  });

  it('does NOT construct Workbox in production when VITE_ENABLE_SW is falsy', () => {
    vi.stubEnv('PROD', true);
    mockEnableSw = false;
    registerServiceWorkerOnce();
    expect(workboxCtor).not.toHaveBeenCalled();
    expect(workboxRegister).not.toHaveBeenCalled();
  });

  it('does NOT construct Workbox when navigator.serviceWorker is absent', () => {
    vi.stubEnv('PROD', true);
    mockEnableSw = true;
    // jsdom has no serviceWorker; the `stubServiceWorker(true)` in
    // beforeEach defines a stub property. To test the absence case,
    // re-define it as `undefined`.
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });
    registerServiceWorkerOnce();
    expect(workboxCtor).not.toHaveBeenCalled();
    expect(workboxRegister).not.toHaveBeenCalled();
  });

  it('constructs Workbox + calls register() exactly once when both gates pass', async () => {
    vi.stubEnv('PROD', true);
    mockEnableSw = true;
    registerServiceWorkerOnce();
    expect(workboxCtor).toHaveBeenCalledTimes(1);
    expect(workboxCtor).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    // Drain microtasks so the floating `wb.register().then.catch`
    // promise has resolved.
    await new Promise((r) => setTimeout(r, 0));
    expect(workboxRegister).toHaveBeenCalledTimes(1);
  });

  it('register() rejection DOES NOT throw — error is captured to console.error', async () => {
    vi.stubEnv('PROD', true);
    mockEnableSw = true;
    workboxRegister.mockRejectedValueOnce(new Error('sw install failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => registerServiceWorkerOnce()).not.toThrow();
    // Drain the promise chain so the `.catch` can run.
    await new Promise((r) => setTimeout(r, 0));
    expect(errorSpy).toHaveBeenCalled();
    expect(String(errorSpy.mock.calls[0]![0])).toMatch(/register FAILED/);
    // The singleton was reset by the catch handler — re-call should
    // re-construct Workbox (proves the retry path works).
    errorSpy.mockClear();
    workboxRegister.mockResolvedValueOnce({ scope: '/' });
    registerServiceWorkerOnce();
    expect(workboxCtor).toHaveBeenCalledTimes(2);
  });

  it('mounts idempotently (no duplicate register on re-call)', async () => {
    vi.stubEnv('PROD', true);
    mockEnableSw = true;
    registerServiceWorkerOnce();
    registerServiceWorkerOnce();
    registerServiceWorkerOnce();
    await new Promise((r) => setTimeout(r, 0));
    expect(workboxCtor).toHaveBeenCalledTimes(1);
    expect(workboxRegister).toHaveBeenCalledTimes(1);
  });

  it('logs console.info on each gate rejection (debug aid)', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubEnv('PROD', false);
    mockEnableSw = true;
    registerServiceWorkerOnce();
    expect(infoSpy.mock.calls.some((c) => String(c[0]).match(/SKIP register/))).toBe(true);
  });
});
