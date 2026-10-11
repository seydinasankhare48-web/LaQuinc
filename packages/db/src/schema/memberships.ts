import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const MEMBERSHIP_ROLES = ['owner', 'manager', 'cashier'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role', { enum: MEMBERSHIP_ROLES }).notNull(),
    pinHash: text('pin_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    unique('memberships_tenant_user_key').on(t.tenantId, t.userId),
    index('memberships_tenant_role_idx').on(t.tenantId, t.role),
    index('memberships_user_idx').on(t.userId),
  ],
);
