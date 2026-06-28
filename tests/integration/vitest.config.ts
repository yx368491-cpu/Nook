import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '../../src') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./tests/integration/setup.ts'],
    // Retry once for flaky network-dependent tests
    retry: 1,
    // Print each test name as it runs
    reporters: ['default'],
    // Suppress specific Supabase fetch warnings
    server: {
      deps: {
        inline: ['@supabase/supabase-js'],
      },
    },
  },
});
