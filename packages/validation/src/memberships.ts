import { z } from 'zod';
import { membershipRoleSchema, uuidSchema } from './common';

export const membershipParamsSchema = z.object({ id: uuidSchema });

export const updateMembershipRoleSchema = z.object({ role: membershipRoleSchema });
export type UpdateMembershipRoleInput = z.infer<typeof updateMembershipRoleSchema>;
