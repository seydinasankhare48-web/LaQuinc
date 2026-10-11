import { Test } from '@nestjs/testing';
import request from 'supertest';
import { APP_URL } from '@laquinc/db/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { configureApp } from './setup';
import { parseEnv } from './config/env';

// Démarre l'application avec la vraie configuration (aucun provider remplacé) :
// détecte un câblage cassé que les tests avec providers factices ne verraient pas.
describe('application boot', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('starts from environment variables only and serves /health', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.DATABASE_URL = APP_URL;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    configureApp(app, parseEnv(process.env));
    await app.init();
    try {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      await request(app.getHttpServer()).get('/me').expect(401);
    } finally {
      await app.close();
    }
  });

  it('refuses to disable rate limiting in production', () => {
    const base = { SUPABASE_URL: 'https://example.supabase.co', DATABASE_URL: 'postgres://x' };
    expect(() => parseEnv({ ...base, NODE_ENV: 'production', RATE_LIMIT_DISABLED: 'true' })).toThrow(/RATE_LIMIT_DISABLED/);
    expect(parseEnv({ ...base, NODE_ENV: 'test', RATE_LIMIT_DISABLED: 'true' }).RATE_LIMIT_DISABLED).toBe(true);
  });

  it('refuses to start with an invalid environment', () => {
    expect(() => parseEnv({ SUPABASE_URL: 'not-a-url' })).toThrow(/Invalid environment/);
  });
});
