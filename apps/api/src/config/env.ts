import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  /** Audience attendue du JWT Supabase. */
  JWT_AUDIENCE: z.string().default('authenticated'),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  PORT: z.coerce.number().int().positive().default(3001),
  /** Mis à "true" dans les tests uniquement. */
  RATE_LIMIT_DISABLED: z.enum(['true', 'false']).default('false'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment: ${fields}`);
  }
  return result.data;
}
