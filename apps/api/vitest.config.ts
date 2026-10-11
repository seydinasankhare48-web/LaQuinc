import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { decorator: { legacy: true } },
  test: {
    globalSetup: ['@laquinc/db/testing/global-setup'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
