import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRole, TenantContext, Tx } from '@laquinc/db';
import { AuditService } from '../audit/audit.service';
import { ConflictError, ForbiddenError, NotFoundError } from '../common/errors';
import { TenantDb } from '../db/tenant-db';
import { MembershipsRepository } from './memberships.repository';

type Ctx = Required<TenantContext>;

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(TenantDb) private readonly db: TenantDb,
    @Inject(MembershipsRepository) private readonly repo: MembershipsRepository,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  list(ctx: Ctx) {
    return this.db.run(ctx, (tx) => this.repo.listActive(tx));
  }

  updateRole(ctx: Ctx, id: string, role: MembershipRole) {
    return this.db.run(ctx, async (tx) => {
      const target = await this.loadTarget(tx, ctx, id);
      if (target.role === role) return target;
      if (target.role === 'owner') await this.assertAnotherOwner(tx, id);
      const updated = await this.repo.setRole(tx, id, role);
      if (!updated) throw new NotFoundError('MEMBERSHIP_NOT_FOUND');
      await this.audit.record(tx, ctx, {
        action: 'membership.role_changed',
        entity: 'memberships',
        entityId: id,
        details: { from: target.role, to: role },
      });
      return updated;
    });
  }

  archive(ctx: Ctx, id: string) {
    return this.db.run(ctx, async (tx) => {
      const target = await this.loadTarget(tx, ctx, id);
      if (target.role === 'owner') await this.assertAnotherOwner(tx, id);
      const archived = await this.repo.archive(tx, id);
      if (!archived) throw new NotFoundError('MEMBERSHIP_NOT_FOUND');
      await this.audit.record(tx, ctx, {
        action: 'membership.archived',
        entity: 'memberships',
        entityId: id,
        details: { role: target.role },
      });
      return archived;
    });
  }

  /** Autre tenant ou inexistant : 404. On ne modifie jamais sa propre membership (pas d'auto-promotion). */
  private async loadTarget(tx: Tx, ctx: Ctx, id: string) {
    const target = await this.repo.findActive(tx, id);
    if (!target) throw new NotFoundError('MEMBERSHIP_NOT_FOUND');
    if (target.userId === ctx.userId) throw new ForbiddenError('CANNOT_MODIFY_SELF');
    return target;
  }

  private async assertAnotherOwner(tx: Tx, id: string) {
    const owners = await this.repo.lockActiveOwners(tx);
    if (!owners.some((o) => o.id !== id)) throw new ConflictError('LAST_OWNER');
  }
}
