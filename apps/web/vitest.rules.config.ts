import { defineConfig } from 'vitest/config';

// Rules tests are plain TS files with relative imports — they don't need
// the React plugin or alias resolution. Keep this config minimal so the
// emulator-only test run starts fast.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/rules/*.test.ts'],
    exclude: ['node_modules'],
  },
});
