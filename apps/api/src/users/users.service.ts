import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { memberships, tenants, users } from '@laquinc/db';
import type { AuthClaims } from '../auth/jwt-verifier';
import { TenantDb } from '../db/tenant-db';

@Injectable()
export class UsersService {
  constructor(@Inject(TenantDb) private readonly db: TenantDb) {}

  /** Profil et quincailleries de l'utilisateur (pour choisir le tenant actif). */
  async me(auth: AuthClaims) {
    const { userId } = auth;
    const [user, mine] = await this.db.run({ userId }, async (tx) => [
      (await tx.select().from(users).where(eq(users.id, userId)))[0],
      await tx
        .select({ id: memberships.id, tenantId: memberships.tenantId, role: memberships.role })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), isNull(memberships.archivedAt))),
    ] as const);

    // Le nom du tenant se lit sous le contexte de ce tenant (la RLS de `tenants` l'exige).
    const withNames = await Promise.all(
      mine.map(async (m) => {
        const [tenant] = await this.db.run({ tenantId: m.tenantId, userId, role: m.role }, (tx) =>
          tx.select({ name: tenants.name, slug: tenants.slug, archivedAt: tenants.archivedAt }).from(tenants),
        );
        return tenant && !tenant.archivedAt ? { ...m, tenantName: tenant.name, tenantSlug: tenant.slug } : undefined;
      }),
    );
    return {
      user: user ?? null,
      phone: auth.phone ?? null,
      memberships: withNames.filter((m): m is NonNullable<typeof m> => m !== undefined),
    };
  }
}
