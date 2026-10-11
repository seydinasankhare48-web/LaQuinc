import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    // Les specs partagent une seule base de test.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
