import postgres from 'postgres';
import { assertSafeTestDatabase, resetTestDatabase, roleUrl, TEST_PASSWORDS } from '@laquinc/db/testing';
import { ADMIN_BASE_URL, ADMIN_E2E_URL, E2E_DB, PORTS } from '../config';
import { startFakeSupabase } from './server';

// Prépare la base e2e (création, schéma, migrations avec laquinc_migrator) puis démarre le faux Supabase.
// Playwright attend /health : l'API et le navigateur ne touchent la base qu'une fois cette étape terminée.
async function main() {
  assertSafeTestDatabase(ADMIN_E2E_URL);
  const base = postgres(ADMIN_BASE_URL, { max: 1, onnotice: () => {} });
  try {
    const exists = await base`SELECT 1 FROM pg_database WHERE datname = ${E2E_DB}`;
    if (exists.length === 0) await base.unsafe(`CREATE DATABASE ${E2E_DB}`);
  } finally {
    await base.end();
  }
  const admin = postgres(ADMIN_E2E_URL, { max: 1, onnotice: () => {} });
  const migrator = postgres(roleUrl('laquinc_migrator', TEST_PASSWORDS.migrator, ADMIN_E2E_URL), { max: 1, onnotice: () => {} });
  try {
    await resetTestDatabase(admin, migrator, TEST_PASSWORDS, ADMIN_E2E_URL);
  } finally {
    await migrator.end();
    await admin.end();
  }
  await startFakeSupabase({ port: PORTS.fake, adminDatabaseUrl: ADMIN_E2E_URL });
  console.log(`[fake-supabase] listening on ${PORTS.fake}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
