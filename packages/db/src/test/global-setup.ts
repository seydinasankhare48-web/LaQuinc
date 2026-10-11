import postgres from 'postgres';
import { ADMIN_URL, TEST_PASSWORDS } from './config';
import { resetTestDatabase } from './reset';

export default async function setup() {
  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  try {
    await resetTestDatabase(admin, TEST_PASSWORDS);
  } finally {
    await admin.end();
  }
}
