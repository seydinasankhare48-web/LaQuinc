import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql };

/**
 * Client Drizzle. L'URL doit être celle du rôle applicatif `laquinc_app` (sans BYPASSRLS).
 * `prepare: false` : compatible avec le pooler Supabase en mode transaction.
 */
export function createDb(url: string, options: { max?: number } = {}): Database {
  const client = postgres(url, { max: options.max ?? 10, prepare: false, onnotice: () => {} });
  return drizzle(client, { schema }) as Database;
}
