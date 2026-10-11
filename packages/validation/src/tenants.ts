import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);

export const createTenantSchema = z
  .object({
    name: text(120).min(2),
    fullName: text(120).optional(),
    ninea: text(30).optional(),
    rccm: text(40).optional(),
  })
  .strict();
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = z
  .object({
    name: text(120).min(2),
    ninea: text(30).nullable(),
    rccm: text(40).nullable(),
  })
  .strict()
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
