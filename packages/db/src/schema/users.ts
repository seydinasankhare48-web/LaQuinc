import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** `id` = `auth.users.id` (Supabase Auth). La clé étrangère est ajoutée en SQL dans la migration. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  fullName: text('full_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
