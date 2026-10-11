import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { uuidv7 } from 'uuidv7';
import type { CreateTenantInput, UpdateTenantInput } from '@laquinc/validation';
import type { TenantContext } from '@laquinc/db';
import { AuditService } from '../audit/audit.service';
import type { AuthClaims } from '../auth/jwt-verifier';
import { BadRequestError, ConflictError, NotFoundError } from '../common/errors';

/** Garde-fou anti-abus : nombre maximal de quincailleries dont un utilisateur est propriétaire. */
export const MAX_OWNED_TENANTS = 3;
import { TenantDb } from '../db/tenant-db';
import { TenantsRepository } from './tenants.repository';

export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'boutique'}-${randomBytes(3).toString('hex')}`;
}

function isUniqueViolation(error: unknown, constraintHint: string): boolean {
  const e = error as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  const code = e.code ?? e.cause?.code;
  const constraint = e.constraint_name ?? e.cause?.constraint_name ?? '';
  return code === '23505' && constraint.includes(constraintHint);
}

@Injectable()
export class TenantsService {
  constructor(
    @Inject(TenantDb) private readonly db: TenantDb,
    @Inject(TenantsRepository) private readonly repo: TenantsRepository,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /**
   * Inscription d'une quincaillerie : tenant, utilisateur et membership `owner` dans une seule transaction.
   * L'UUID du tenant est généré ici et placé dans le contexte (le futur propriétaire écrit pour ce tenant seulement).
   */
  async create(auth: AuthClaims, input: CreateTenantInput) {
    if (!auth.phone) throw new BadRequestError('PHONE_REQUIRED');
    const phone = auth.phone;

    const owned = await this.db.run({ userId: auth.userId }, (tx) => this.repo.countOwnedTenants(tx, auth.userId));
    if (owned >= MAX_OWNED_TENANTS) throw new ConflictError('TENANT_LIMIT');

    for (let attempt = 0; attempt < 3; attempt++) {
      const tenantId = uuidv7();
      const ctx = { tenantId, userId: auth.userId, role: 'owner' } as const;
      try {
        return await this.db.run(ctx, async (tx) => {
          const tenant = await this.repo.insertTenant(tx, {
            id: tenantId,
            name: input.name,
            slug: slugify(input.name),
            ninea: input.ninea,
            rccm: input.rccm,
          });
          await this.repo.ensureUser(tx, { id: auth.userId, phone, fullName: input.fullName });
          const membershipId = uuidv7();
          await this.repo.insertMembership(tx, {
            id: membershipId,
            tenantId,
            userId: auth.userId,
            role: 'owner',
            createdBy: auth.userId,
          });
          await this.audit.record(tx, ctx, { action: 'tenant.created', entity: 'tenants', entityId: tenantId });
          return { tenant, membership: { id: membershipId, role: 'owner' as const } };
        });
      } catch (error) {
        if (isUniqueViolation(error, 'slug')) continue;
        if (isUniqueViolation(error, 'phone')) throw new ConflictError('PHONE_ALREADY_USED');
        throw error;
      }
    }
    throw new ConflictError('SLUG_UNAVAILABLE');
  }

  async getCurrent(ctx: Required<TenantContext>) {
    const tenant = await this.db.run(ctx, (tx) => this.repo.findById(tx, ctx.tenantId));
    if (!tenant) throw new NotFoundError('TENANT_NOT_FOUND');
    return tenant;
  }

  async updateCurrent(ctx: Required<TenantContext>, input: UpdateTenantInput) {
    return this.db.run(ctx, async (tx) => {
      const tenant = await this.repo.update(tx, ctx.tenantId, input);
      if (!tenant) throw new NotFoundError('TENANT_NOT_FOUND');
      await this.audit.record(tx, ctx, {
        action: 'tenant.updated',
        entity: 'tenants',
        entityId: ctx.tenantId,
        details: { fields: Object.keys(input) },
      });
      return tenant;
    });
  }
}
