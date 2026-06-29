import '@testing-library/jest-dom/vitest';
// M5-1 — fake-indexeddb provides a working IndexedDB implementation
// in the jsdom test environment. It MUST be imported BEFORE any
// `lib/db/*` module loads so Dexie can open its database using
// `indexedDB.open(...)`. The `/auto` entry registers all the
// IDB-related globals (`indexedDB`, `IDBKeyRange`, structuredClone
// is polyfilled by jsdom natively).
import 'fake-indexeddb/auto';
