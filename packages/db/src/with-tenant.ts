import { sql } from 'drizzle-orm';
import type { Database } from './client';

export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface TenantContext {
  /** Tenant actif, déjà vérifié par l'API (membership de l'utilisateur). */
  tenantId?: string;
  /** `sub` du JWT Supabase vérifié (= `users.id`). */
  userId?: string;
}

export class InvalidTenantContextError extends Error {
  constructor(field: string) {
    super(`Invalid ${field} in tenant context`);
    this.name = 'InvalidTenantContextError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Exécute `fn` dans une transaction dont le contexte (`app.tenant_id`, `app.user_id`) est limité à la
 * transaction (`set_config(..., true)`) : il ne fuit jamais vers la requête suivante. Les politiques RLS
 * lisent ces deux valeurs.
 */
export async function withTenant<T>(
  db: Database,
  context: TenantContext,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (context.tenantId !== undefined && !UUID.test(context.tenantId)) {
    throw new InvalidTenantContextError('tenantId');
  }
  if (context.userId !== undefined && !UUID.test(context.userId)) {
    throw new InvalidTenantContextError('userId');
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.tenant_id', ${context.tenantId ?? ''}, true), set_config('app.user_id', ${context.userId ?? ''}, true)`,
    );
    return fn(tx);
  });
}
