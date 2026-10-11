import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_MIGRATOR_URL;
if (!url) throw new Error('DATABASE_MIGRATOR_URL is not set');

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: new URL('../../migrations', import.meta.url).pathname });
  console.log('Migrations applied');
} finally {
  await client.end();
}
