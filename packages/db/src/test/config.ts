export const ADMIN_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54330/laquinc_test';

export const TEST_PASSWORDS = {
  app: 'test-app-password',
  migrator: 'test-migrator-password',
} as const;

export function roleUrl(role: string, password: string): string {
  const url = new URL(ADMIN_URL);
  url.username = role;
  url.password = password;
  return url.toString();
}

export const APP_URL = roleUrl('laquinc_app', TEST_PASSWORDS.app);
