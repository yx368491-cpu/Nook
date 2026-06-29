import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/**
 * Nook v1.0 Vite config.
 *
 * M5-2 — Service Worker background sync wiring:
 *
 *   - vite-plugin-pwa in `generateSW` mode (no custom src/sw.ts; the
 *     plugin emits dist/sw.js at build time from this config).
 *   - `workbox.runtimeCaching` declares a POST-to-/rest/v1/* route
 *     with the `NetworkOnly` strategy augmented by a Workbox
 *     `BackgroundSyncPlugin` queue named `nook-messages-queue` (max
 *     retention 7 days × 5 retries). This is the HTTP-level replay
 *     path; it complements (does NOT replace) the Dexie outbox
 *     state machine which powers user-visible observability.
 *   - Client-side register is owned by `src/hooks/useServiceWorker.ts`
 *     and gated by `import.meta.env.PROD` + `VITE_ENABLE_SW === 'true'`.
 *   - `dev` mode never sees the SW (assets aren't emitted and the
 *     register hook is a no-op), preserving first-load dev loop
 *     ergonomics.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Workbox `generateSW` mode emits dist/sw.js + manifest.webmanifest
      // at build time. M5-2 ships the SW as a generated file (deferred
      // to a later milestone if we ever need truly custom SW code).
      registerType: 'autoUpdate',
      injectRegister: false, // M5-2 — useServiceWorker.ts owns the register
      // call so we can honor the VITE_ENABLE_SW env flag + decide whether
      // to skip in development. The plugin's auto-injected register call
      // would fire regardless of env, which violates our per-flavor gate.
      includeAssets: ['fonts/*.woff2', 'icons/*.png'],
      manifest: {
        name: 'Nook',
        short_name: 'Nook',
        description: 'A Digital Sanctuary',
        theme_color: '#1a1a1a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        cleanupOutdatedCaches: true,
        // M5-2 — POST-to-/rest/v1/* gets a Workbox Background Sync queue
        // named `nook-messages-queue`. On fetch failure the request is
        // persisted to IndexedDB; once connectivity returns Workbox
        // replays the queue (FIFO). Server-side client_msg_id
        // `messages_client_msg_id_unique_idx` (partial unique) catches
        // any double-replay at the DB layer. The queue's max retention
        // is 7 days (10 080 min) covering the longest plausible outage
        // window for a small closed friend group — beyond that, the
        // user is presumed offline-on-purpose and manual intervention
        // is appropriate. (Tunable in v1.1+ from this single constant
        // if product telemetry suggests a longer window is warranted.)
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith('/rest/v1/') && request.method === 'POST',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'nook-messages-queue',
                options: {
                  maxRetentionTime: 7 * 24 * 60, // 7 days, expressed in minutes
                  maxRetries: 5,
                },
              },
            },
          },
          {
            // M5-4 — image BYTE uploads (POST) to the `attachments`
            // storage bucket share the same Workbox Background Sync
            // queue. Failed self-uploads retry on next connectivity
            // the same way failed text POSTs do. Shares the
            // `nook-messages-queue` name so the SW replay path is
            // unified across message types (text + image + file);
            // server-side client_msg_id dedupe
            // (`messages_client_msg_id_unique_idx`) cuts both.
            // POSTs are NOT cacheable, so `cacheableResponse` is
            // intentionally absent.
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith('/storage/v1/object/attachments/') &&
              request.method === 'POST',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'nook-messages-queue',
                options: {
                  maxRetentionTime: 7 * 24 * 60, // 7 days, expressed in minutes
                  maxRetries: 5,
                },
              },
            },
          },
          {
            // Existing (M1-6) POST-agnostic GET cache for Supabase
            // REST reads — kept untouched so M3-3 listMessages stays
            // warm. BackgroundSync is intentionally NOT applied to GET;
            // failed reads fall back to Dexie's warm-tier listOutbox /
            // stale render path.
            urlPattern: /\/rest\/v1\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-api' },
          },
          { urlPattern: /\.(woff2|png|jpg|svg)$/, handler: 'CacheFirst', options: { cacheName: 'static-assets' } },
          // M5-4 — image bytes cache. The signed URL hits
          // `/storage/v1/object/sign/attachments/<uuid>/<safe-name>?token=...`
          // when `<Bubble.Image>` resolves via `getAttachmentSignedUrl()`.
          // CacheFirst with ExpirationPlugin gives us offline-readable
          // images for repeat views: the first signed URL fetch caches
          // the bytes, subsequent signed URL fetches (after token expiry)
          // re-sign and re-cache. The 200 MB / 30 day cap mirrors
          // `ATTACHMENT_CACHE_MAX_BYTES` / `ATTACHMENT_CACHE_MAX_AGE_MS`
          // in `lib/db/attachments.ts` so the Workbox HTTP cache and
          // the Dexie IDB cache agree on expiry semantics. When the
          // Dexie cache hits, AttachmentImage bypasses this cache
          // entirely (zero network); when Dexie misses but Workbox
          // hits (cold-boot after quota purge), this is the second-tier
          // fast path.
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/storage/v1/object/sign/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'nook-image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                maxSizeBytes: 200 * 1024 * 1024, // 200 MB
              },
              cacheableResponse: {
                statuses: [0, 200], // 0 = opaque (cross-origin supabase response)
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
  server: { port: 5173, host: true },
});
