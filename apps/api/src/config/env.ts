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
  NODE_ENV: z.string().default('development'),
  /** Nombre de proxys de confiance devant l'API (0 = aucun). Détermine l'IP vue par la limitation de débit. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Tests uniquement : refusé en production. */
  RATE_LIMIT_DISABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
}).refine((e) => !(e.NODE_ENV === 'production' && e.RATE_LIMIT_DISABLED), {
  message: 'RATE_LIMIT_DISABLED must not be set in production',
  path: ['RATE_LIMIT_DISABLED'],
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
