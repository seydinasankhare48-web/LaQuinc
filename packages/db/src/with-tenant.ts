import { sql } from 'drizzle-orm';
import type { Database } from './client';
import type { MembershipRole } from './schema';
import { MEMBERSHIP_ROLES } from './schema';

export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface TenantContext {
  /** Tenant actif, déjà vérifié par l'API (membership de l'utilisateur). */
  tenantId?: string;
  /** `sub` du JWT Supabase vérifié (= `users.id`). */
  userId?: string;
  /**
   * Rôle de la membership vérifiée par l'API. Les politiques RLS réservent l'écriture sur `memberships`
   * et `tenants` à `owner`. Ne jamais le prendre d'une valeur envoyée par le client.
   */
  role?: MembershipRole;
}

export class InvalidTenantContextError extends Error {
  constructor(field: string) {
    super(`Invalid ${field} in tenant context`);
    this.name = 'InvalidTenantContextError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Exécute `fn` dans une transaction dont le contexte (`app.tenant_id`, `app.user_id`, `app.role`) est limité
 * à la transaction (`set_config(..., true)`) : il ne fuit jamais vers la requête suivante.
 * Un contexte vide est permis (fail-closed : la RLS ne laisse alors rien passer).
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
  if (context.role !== undefined && !MEMBERSHIP_ROLES.includes(context.role)) {
    throw new InvalidTenantContextError('role');
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.tenant_id', ${context.tenantId ?? ''}, true),
                 set_config('app.user_id', ${context.userId ?? ''}, true),
                 set_config('app.role', ${context.role ?? ''}, true)`,
    );
    return fn(tx);
  });
}
