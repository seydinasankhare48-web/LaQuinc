import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { ensureAuthUsersForeignKey } from '../bootstrap';

const url = process.env.DATABASE_MIGRATOR_URL;
if (!url) throw new Error('DATABASE_MIGRATOR_URL is not set');

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), {
    migrationsFolder: new URL('../../migrations', import.meta.url).pathname,
  });
  console.log('Migrations applied');
} finally {
  await client.end();
}

// Supabase : le migrator ne peut pas référencer auth.users, l'administrateur ajoute la clé étrangère.
const adminUrl = process.env.DATABASE_ADMIN_URL;
if (adminUrl) {
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    await ensureAuthUsersForeignKey(admin);
    console.log('Auth foreign key ensured');
  } finally {
    await admin.end();
  }
}
