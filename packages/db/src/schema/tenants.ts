import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ninea: text('ninea'),
  rccm: text('rccm'),
  country: text('country').notNull().default('SN'),
  currency: text('currency').notNull().default('XOF'),
  timezone: text('timezone').notNull().default('Africa/Dakar'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
