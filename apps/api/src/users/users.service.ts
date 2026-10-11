import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { memberships, tenants, users } from '@laquinc/db';
import type { AuthClaims } from '../auth/jwt-verifier';
import { TenantDb } from '../db/tenant-db';

@Injectable()
export class UsersService {
  constructor(@Inject(TenantDb) private readonly db: TenantDb) {}

  /** Profil et quincailleries de l'utilisateur (pour choisir le tenant actif) : une seule transaction. */
  async me(auth: AuthClaims) {
    const { userId } = auth;
    const { user, mine } = await this.db.run({ userId }, async (tx) => ({
      user: (await tx.select().from(users).where(eq(users.id, userId)))[0],
      mine: await tx
        .select({
          id: memberships.id,
          tenantId: memberships.tenantId,
          role: memberships.role,
          tenantName: tenants.name,
          tenantSlug: tenants.slug,
        })
        .from(memberships)
        .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
        .where(and(eq(memberships.userId, userId), isNull(memberships.archivedAt), isNull(tenants.archivedAt))),
    }));
    return { user: user ?? null, phone: auth.phone ?? null, memberships: mine };
  }
}
