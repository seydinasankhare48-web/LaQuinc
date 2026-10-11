import { Injectable } from '@nestjs/common';
import { auditLogs, type TenantContext, type Tx } from '@laquinc/db';
import { uuidv7 } from 'uuidv7';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/** Écrit dans `audit_logs` dans la même transaction que l'action : les deux réussissent ou échouent ensemble. */
@Injectable()
export class AuditService {
  async record(tx: Tx, ctx: Required<TenantContext>, entry: AuditEntry): Promise<void> {
    await tx.insert(auditLogs).values({
      id: uuidv7(),
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      details: entry.details,
    });
  }
}
