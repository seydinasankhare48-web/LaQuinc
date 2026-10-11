import { z } from 'zod';
import { membershipRoleSchema, uuidSchema } from './common';

export const membershipParamsSchema = z.object({ id: uuidSchema }).strict();

export const updateMembershipRoleSchema = z.object({ role: membershipRoleSchema }).strict();
export type UpdateMembershipRoleInput = z.infer<typeof updateMembershipRoleSchema>;
