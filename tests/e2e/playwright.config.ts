import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { APP_E2E_URL, PORTS } from './src/config';

const root = fileURLToPath(new URL('../..', import.meta.url));
const fakeUrl = `http://localhost:${PORTS.fake}`;
const apiUrl = `http://localhost:${PORTS.api}`;
const webUrl = `http://localhost:${PORTS.web}`;

// Prérequis : `pnpm build` du web avec les variables NEXT_PUBLIC_* ci-dessous et de l'API (voir le script `pnpm e2e`).
export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: webUrl, trace: 'retain-on-failure', locale: 'fr-FR' },
  // Un Android d'entrée de gamme : petit écran, écran tactile.
  projects: [{ name: 'mobile', use: { ...devices['Pixel 5'], browserName: 'chromium' } }],
  webServer: [
    {
      command: 'pnpm --filter @laquinc/e2e fake-supabase',
      cwd: root,
      url: `${fakeUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'node apps/api/dist/main.js',
      cwd: root,
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PORT: String(PORTS.api),
        SUPABASE_URL: fakeUrl,
        DATABASE_URL: APP_E2E_URL,
        CORS_ORIGINS: webUrl,
        NODE_ENV: 'test',
        RATE_LIMIT_DISABLED: 'true',
      },
    },
    {
      command: `pnpm --filter @laquinc/web exec next start -p ${PORTS.web}`,
      cwd: root,
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
