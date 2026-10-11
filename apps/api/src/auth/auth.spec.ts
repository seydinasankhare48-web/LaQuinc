import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedWorld, type World } from '@laquinc/db/testing';
import { createTestApp, ISSUER, AUDIENCE, type TestApp } from '../test/harness';
import { normalizePhone } from './jwt-verifier';

let t: TestApp;
let w: World;
beforeAll(async () => {
  t = await createTestApp();
  w = await seedWorld(t.admin);
});
afterAll(() => t.close());

const get = (path: string, token?: string) => {
  const r = request(t.app.getHttpServer()).get(path);
  return token ? r.set('Authorization', `Bearer ${token}`) : r;
};

describe('JWT verification', () => {
  it('lets /health through without a token', async () => {
    await get('/health').expect(200);
  });

  it('rejects a request without a token', async () => {
    const res = await get('/me').expect(401);
    expect(res.body).toEqual({ error: { code: 'MISSING_TOKEN' } });
  });

  it('accepts a valid token', async () => {
    await get('/me', await t.token({ sub: w.userA })).expect(200);
  });

  it('rejects an expired token', async () => {
    await get('/me', await t.token({ sub: w.userA, expiresIn: -60 })).expect(401);
  });

  it('rejects a wrong issuer and a wrong audience', async () => {
    await get('/me', await t.token({ sub: w.userA, iss: 'https://evil.example/auth/v1' })).expect(401);
    await get('/me', await t.token({ sub: w.userA, aud: 'anon' })).expect(401);
  });

  it('rejects a tampered token', async () => {
    const token = await t.token({ sub: w.userA });
    const [h, p, s] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: w.userB, iss: ISSUER, aud: AUDIENCE, exp: 9999999999 })).toString('base64url');
    await get('/me', `${h}.${forgedPayload}.${s}`).expect(401);
    expect(p).toBeTruthy();
  });

  it('rejects an HS256 token signed with a shared secret', async () => {
    const hs = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(w.userA)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('super-secret-super-secret-super-secret'));
    await get('/me', hs).expect(401);
  });

  it('rejects an unsigned token (alg none) and garbage', async () => {
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: w.userA, iss: ISSUER, aud: AUDIENCE, exp: 9999999999 })).toString('base64url')}.`;
    await get('/me', none).expect(401);
    await get('/me', 'not-a-jwt').expect(401);
  });

  it('rejects anonymous Supabase sessions', async () => {
    await get('/me', await t.token({ sub: w.userA, isAnonymous: true })).expect(401);
  });

  it('rejects a token whose subject is not a UUID', async () => {
    await get('/me', await t.token({ sub: 'admin' })).expect(401);
  });
});

describe('normalizePhone', () => {
  it('adds the + that Supabase omits', () => {
    expect(normalizePhone('221770000000')).toBe('+221770000000');
    expect(normalizePhone('+221770000000')).toBe('+221770000000');
    expect(normalizePhone(undefined)).toBeUndefined();
    expect(normalizePhone('12')).toBeUndefined();
    expect(normalizePhone('abc')).toBeUndefined();
  });
});
