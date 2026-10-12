import { roleUrl, TEST_PASSWORDS } from '@laquinc/db/testing';

export const PORTS = { fake: 54399, api: 3101, web: 3100 } as const;
export const E2E_DB = 'laquinc_e2e_test';

/** Même serveur PostgreSQL que les tests, mais une base dédiée : les e2e n'interfèrent pas avec les autres tests. */
export function e2eUrl(url: string): string {
  const u = new URL(url);
  u.pathname = `/${E2E_DB}`;
  return u.toString();
}

export const ADMIN_BASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54330/laquinc_test';
export const ADMIN_E2E_URL = e2eUrl(ADMIN_BASE_URL);
export const APP_E2E_URL = e2eUrl(roleUrl('laquinc_app', TEST_PASSWORDS.app, ADMIN_BASE_URL));
