import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/index.css';
import './lib/i18n';
// M5-2 — Service Worker register is a no-op in dev and a one-shot
// register() call in production with VITE_ENABLE_SW set. We invoke it
// as a plain function (NOT a React hook, to avoid the hook-rule
// violation that the v1 candidate had) BEFORE ReactDOM render so
// the SW can begin installing in parallel with the first paint
// (small perceived perf win on slow networks).
import { registerServiceWorkerOnce } from './hooks/useServiceWorker';
// M5-3 — Startup outbox rehydrate. Sweeps Dexie for `pending`
// rows whose `createdAt` is older than `STALE_THRESHOLD_MS`
// (5 min) and surfaces them as terminal `failed` rows so the
// user sees the reconnecting strip + outbox toast. Fire-and-
// forget: the first paint must NOT block on a Dexie scan.
// Module-level singleton inside `rehydrateOutboxOnStartup` makes
// any accidental double-invocation safe.
import { rehydrateOutboxOnStartup } from './lib/db/rehydrate';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// M5-2 — boot-time SW registration. The function is a no-op unless
// both `import.meta.env.PROD` AND `VITE_ENABLE_SW="true"` are set
// (and `navigator.serviceWorker` exists). The module-level singleton
// inside `registerServiceWorkerOnce` re-runs are safe no-ops.
registerServiceWorkerOnce();

// M5-3 — boot-time outbox rehydrate sweep. Also gated by
// `typeof indexedDB !== 'undefined'` so SSR / test environments
// without IndexedDB short-circuit cleanly. Rehydrate errors
// surface as `console.warn` — they're observability, not a
// critical path for HTTP delivery. The module-level singleton
// inside `rehydrateOutboxOnStartup` short-circuits any
// accidental double-invocation (HMR, React StrictMode).
if (typeof indexedDB !== 'undefined') {
  void rehydrateOutboxOnStartup().catch((err: unknown) => {
    console.warn('[nook/outbox] startup rehydrate failed', err);
  });
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
