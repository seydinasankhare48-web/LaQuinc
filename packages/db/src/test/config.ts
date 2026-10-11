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
export const MIGRATOR_URL = roleUrl('laquinc_migrator', TEST_PASSWORDS.migrator);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * La remise à zéro fait `DROP SCHEMA … CASCADE` : on refuse toute base qui n'est pas clairement
 * une base de test locale (nom en `_test`, hôte local).
 */
export function assertSafeTestDatabase(urlString: string): void {
  const url = new URL(urlString);
  const database = url.pathname.replace(/^\//, '');
  if (!database.endsWith('_test')) {
    throw new Error(`Refusing to reset database "${database}": its name must end with "_test"`);
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing to reset database on host "${url.hostname}": only local hosts are allowed`);
  }
}
