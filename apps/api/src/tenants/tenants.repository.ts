import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { memberships, tenants, users, type Tx } from '@laquinc/db';

type TenantRow = typeof tenants.$inferSelect;

@Injectable()
export class TenantsRepository {
  async insertTenant(tx: Tx, values: typeof tenants.$inferInsert): Promise<TenantRow> {
    const [row] = await tx.insert(tenants).values(values).returning();
    if (!row) throw new Error('Tenant insert returned no row');
    return row;
  }

  async ensureUser(tx: Tx, values: { id: string; phone: string; fullName?: string }): Promise<void> {
    await tx.insert(users).values(values).onConflictDoNothing({ target: users.id });
  }

  async insertMembership(tx: Tx, values: typeof memberships.$inferInsert): Promise<void> {
    await tx.insert(memberships).values(values);
  }

  async findById(tx: Tx, id: string): Promise<TenantRow | undefined> {
    const [row] = await tx.select().from(tenants).where(eq(tenants.id, id));
    return row;
  }

  async update(tx: Tx, id: string, values: Partial<typeof tenants.$inferInsert>): Promise<TenantRow | undefined> {
    const [row] = await tx
      .update(tenants)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return row;
  }
}
