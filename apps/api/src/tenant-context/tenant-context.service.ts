import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { memberships, tenants, type TenantContext } from '@laquinc/db';
import { BadRequestError, NotFoundError } from '../common/errors';
import { TenantDb } from '../db/tenant-db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Résout le tenant actif d'un utilisateur authentifié. Le tenant n'est jamais cru sur parole :
 * un `X-Tenant-Id` fourni par le client n'est appliqué que s'il correspond à une membership active.
 */
@Injectable()
export class TenantContextService {
  constructor(@Inject(TenantDb) private readonly db: TenantDb) {}

  async resolve(userId: string, requestedTenantId?: string): Promise<Required<TenantContext>> {
    if (requestedTenantId !== undefined && !UUID.test(requestedTenantId)) {
      throw new BadRequestError('INVALID_TENANT_ID');
    }
    // Sous le seul `app.user_id`, la RLS ne laisse voir que les memberships de cet utilisateur.
    const mine = await this.db.run({ userId }, (tx) =>
      tx
        .select({ tenantId: memberships.tenantId, role: memberships.role })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), isNull(memberships.archivedAt))),
    );

    let chosen = mine.find((m) => m.tenantId === requestedTenantId);
    if (requestedTenantId === undefined) {
      if (mine.length > 1) throw new BadRequestError('TENANT_REQUIRED');
      chosen = mine[0];
    }
    if (!chosen) throw new NotFoundError('TENANT_NOT_FOUND');

    const ctx = { tenantId: chosen.tenantId, userId, role: chosen.role };
    const [tenant] = await this.db.run(ctx, (tx) =>
      tx.select({ archivedAt: tenants.archivedAt }).from(tenants).where(eq(tenants.id, ctx.tenantId)),
    );
    if (!tenant || tenant.archivedAt) throw new NotFoundError('TENANT_NOT_FOUND');
    return ctx;
  }
}
