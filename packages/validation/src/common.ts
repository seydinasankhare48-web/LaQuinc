import { z } from 'zod';

export const uuidSchema = z.string().uuid();

/** Téléphone E.164, ex. +221771234567 */
export const e164PhoneSchema = z.string().regex(/^\+[1-9][0-9]{7,14}$/, 'Invalid phone number');

export const membershipRoleSchema = z.enum(['owner', 'manager', 'cashier']);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;
