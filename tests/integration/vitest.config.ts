import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Vitest config for the SQL-invariant mirror suite (S29.0 static-only
// verification). Pinned to tests/integration/sql via root + include, so
// the M2-3 EF integration tests in tests/integration/ root (which need
// cloud Supabase per FU-STG-03) are not picked up by this config.
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: { '@': path.resolve(__dirname, '..', '..', 'src') },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['./sql/**/*.test.ts', './sql/**/*.test.tsx'],
  },
});
