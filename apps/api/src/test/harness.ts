import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createDb, type Database } from '@laquinc/db';
import { APP_URL, ADMIN_URL } from '@laquinc/db/testing';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import postgres from 'postgres';
import { uuidv7 } from 'uuidv7';
import { AppModule } from '../app.module';
import { JoseJwtVerifier } from '../auth/jwt-verifier';
import { parseEnv } from '../config/env';
import { configureApp } from '../setup';
import { DATABASE, ENV, JWT_VERIFIER } from '../tokens';

export const SUPABASE_URL = 'https://test-project.supabase.co';
export const ISSUER = `${SUPABASE_URL}/auth/v1`;
export const AUDIENCE = 'authenticated';

export interface TestApp {
  app: INestApplication;
  db: Database;
  admin: postgres.Sql;
  token: (claims?: TokenClaims) => Promise<string>;
  close: () => Promise<void>;
}

export interface TokenClaims {
  sub?: string;
  phone?: string;
  aal?: string;
  isAnonymous?: boolean;
  iss?: string;
  aud?: string;
  /** secondes depuis maintenant ; négatif = expiré */
  expiresIn?: number;
}

export async function createTestApp(): Promise<TestApp> {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256', use: 'sig' };
  const verifier = new JoseJwtVerifier(createLocalJWKSet({ keys: [jwk] }), ISSUER, AUDIENCE);

  const env = parseEnv({ SUPABASE_URL, DATABASE_URL: APP_URL, RATE_LIMIT_DISABLED: 'true', NODE_ENV: 'test' });
  const db = createDb(APP_URL, { max: 5 });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .overrideProvider(JWT_VERIFIER)
    .useValue(verifier)
    .overrideProvider(DATABASE)
    .useValue(db)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, env);
  await app.init();

  const admin = postgres(ADMIN_URL, { max: 2, onnotice: () => {} });
  const token = (c: TokenClaims = {}) =>
    new SignJWT({ phone: c.phone, aal: c.aal ?? 'aal1', role: 'authenticated', is_anonymous: c.isAnonymous })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(c.sub ?? uuidv7())
      .setIssuer(c.iss ?? ISSUER)
      .setAudience(c.aud ?? AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + (c.expiresIn ?? 3600))
      .sign(privateKey);

  return {
    app,
    db,
    admin,
    token,
    close: async () => {
      await app.close();
      await db.$client.end();
      await admin.end();
    },
  };
}

let counter = 0;
/** Crée un utilisateur Supabase Auth + notre ligne `users`, avec le rôle admin (contourne la RLS). */
export async function createUser(admin: postgres.Sql): Promise<{ id: string; phone: string }> {
  const id = uuidv7();
  const phone = `+22178${String(Date.now() % 100_000_000).padStart(8, '0')}${counter++}`;
  await admin`INSERT INTO auth.users (id, phone) VALUES (${id}, ${phone})`;
  await admin`INSERT INTO users (id, phone) VALUES (${id}, ${phone})`;
  return { id, phone };
}

export async function addMember(
  admin: postgres.Sql,
  tenantId: string,
  role: 'owner' | 'manager' | 'cashier',
): Promise<{ userId: string; membershipId: string }> {
  const user = await createUser(admin);
  const membershipId = uuidv7();
  await admin`INSERT INTO memberships (id, tenant_id, user_id, role) VALUES (${membershipId}, ${tenantId}, ${user.id}, ${role})`;
  return { userId: user.id, membershipId };
}
