import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { memberships, users, type MembershipRole, type Tx } from '@laquinc/db';

@Injectable()
export class MembershipsRepository {
  listActive(tx: Tx) {
    return tx
      .select({
        id: memberships.id,
        userId: memberships.userId,
        role: memberships.role,
        createdAt: memberships.createdAt,
        phone: users.phone,
        fullName: users.fullName,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(isNull(memberships.archivedAt));
  }

  async findActive(tx: Tx, id: string) {
    const [row] = await tx
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, id), isNull(memberships.archivedAt)));
    return row;
  }

  /** Verrouille les owners actifs : deux rétrogradations simultanées ne peuvent pas laisser zéro owner. */
  lockActiveOwners(tx: Tx) {
    return tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.role, 'owner'), isNull(memberships.archivedAt)))
      .for('update');
  }

  async setRole(tx: Tx, id: string, role: MembershipRole) {
    const [row] = await tx
      .update(memberships)
      .set({ role, updatedAt: new Date() })
      .where(eq(memberships.id, id))
      .returning();
    return row;
  }

  async archive(tx: Tx, id: string) {
    const [row] = await tx
      .update(memberships)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(memberships.id, id))
      .returning();
    return row;
  }
}
