import postgres from 'postgres';
import { ADMIN_URL, assertSafeTestDatabase, MIGRATOR_URL, TEST_PASSWORDS } from './config';
import { resetTestDatabase } from './reset';

export default async function setup() {
  assertSafeTestDatabase(ADMIN_URL);
  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  const migrator = postgres(MIGRATOR_URL, { max: 1, onnotice: () => {} });
  try {
    await resetTestDatabase(admin, migrator, TEST_PASSWORDS);
  } finally {
    await migrator.end();
    await admin.end();
  }
}
