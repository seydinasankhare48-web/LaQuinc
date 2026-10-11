import { uuidv7 } from 'uuidv7';
import type { Sql } from 'postgres';

export interface World {
  tenantA: string;
  tenantB: string;
  /** owner du tenant A seulement */
  userA: string;
  /** owner du tenant B seulement */
  userB: string;
  /** membre (cashier) des deux tenants */
  userShared: string;
  membershipA: string;
  membershipB: string;
  auditA: string;
  auditB: string;
}

let phoneCounter = 0;

async function insertUser(admin: Sql, id: string) {
  const phone = `+22177${String(Date.now() % 1_000_000).padStart(6, '0')}${phoneCounter++}`;
  await admin`INSERT INTO auth.users (id, phone) VALUES (${id}, ${phone})`;
  await admin`INSERT INTO users (id, phone) VALUES (${id}, ${phone})`;
}

/** Deux tenants et trois utilisateurs, créés avec le rôle admin (qui contourne la RLS). */
export async function seedWorld(admin: Sql): Promise<World> {
  const w: World = {
    tenantA: uuidv7(),
    tenantB: uuidv7(),
    userA: uuidv7(),
    userB: uuidv7(),
    userShared: uuidv7(),
    membershipA: uuidv7(),
    membershipB: uuidv7(),
    auditA: uuidv7(),
    auditB: uuidv7(),
  };
  for (const [id, name] of [
    [w.tenantA, 'A'],
    [w.tenantB, 'B'],
  ] as const) {
    await admin`INSERT INTO tenants (id, name, slug) VALUES (${id}, ${'Quincaillerie ' + name}, ${'q-' + id})`;
  }
  for (const id of [w.userA, w.userB, w.userShared]) await insertUser(admin, id);

  await admin`INSERT INTO memberships (id, tenant_id, user_id, role) VALUES (${w.membershipA}, ${w.tenantA}, ${w.userA}, 'owner')`;
  await admin`INSERT INTO memberships (id, tenant_id, user_id, role) VALUES (${w.membershipB}, ${w.tenantB}, ${w.userB}, 'owner')`;
  await admin`INSERT INTO memberships (id, tenant_id, user_id, role) VALUES (${uuidv7()}, ${w.tenantA}, ${w.userShared}, 'cashier')`;
  await admin`INSERT INTO memberships (id, tenant_id, user_id, role) VALUES (${uuidv7()}, ${w.tenantB}, ${w.userShared}, 'cashier')`;

  await admin`INSERT INTO audit_logs (id, tenant_id, actor_user_id, action, entity) VALUES (${w.auditA}, ${w.tenantA}, ${w.userA}, 'price.changed', 'products')`;
  await admin`INSERT INTO audit_logs (id, tenant_id, actor_user_id, action, entity) VALUES (${w.auditB}, ${w.tenantB}, ${w.userB}, 'price.changed', 'products')`;
  return w;
}
