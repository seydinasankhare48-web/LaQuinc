import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import postgres from 'postgres';
import { uuidv7 } from 'uuidv7';

export const TEST_OTP = '123456';

interface Options {
  port: number;
  /** URL de la base (rôle administrateur) pour créer les lignes `auth.users`, comme le ferait Supabase Auth. */
  adminDatabaseUrl: string;
}

/**
 * Faux Supabase Auth pour les tests e2e : les routes utilisées par supabase-js pour la connexion par
 * téléphone, et le JWKS que l'API vérifie. Les JWT sont signés en ES256 comme ceux d'un projet Supabase
 * (téléphone sans « + », `aud`, `iss`, `aal`). Ce n'est PAS le vrai GoTrue : un test de fumée au staging complète.
 */
export async function startFakeSupabase({ port, adminDatabaseUrl }: Options): Promise<Server> {
  const issuer = `http://localhost:${port}/auth/v1`;
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'fake-supabase-key', alg: 'ES256', use: 'sig' };
  const db = postgres(adminDatabaseUrl, { max: 2, onnotice: () => {} });

  const usersByPhone = new Map<string, string>();
  const refreshTokens = new Map<string, string>(); // refresh_token -> user id
  const accessTokens = new Map<string, { id: string; phone: string }>();

  async function userFor(phoneDigits: string): Promise<{ id: string; phone: string }> {
    let id = usersByPhone.get(phoneDigits);
    if (!id) {
      id = uuidv7();
      await db`INSERT INTO auth.users (id, phone) VALUES (${id}, ${phoneDigits})`;
      usersByPhone.set(phoneDigits, id);
    }
    return { id, phone: phoneDigits };
  }

  async function session(user: { id: string; phone: string }) {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600;
    const accessToken = await new SignJWT({
      phone: user.phone,
      role: 'authenticated',
      aal: 'aal1',
      session_id: uuidv7(),
      is_anonymous: false,
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'fake-supabase-key', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(issuer)
      .setAudience('authenticated')
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(privateKey);
    const refreshToken = uuidv7();
    refreshTokens.set(refreshToken, user.id);
    accessTokens.set(accessToken, user);
    const iso = new Date().toISOString();
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      expires_at: now + expiresIn,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        aud: 'authenticated',
        role: 'authenticated',
        phone: user.phone,
        phone_confirmed_at: iso,
        confirmed_at: iso,
        last_sign_in_at: iso,
        app_metadata: { provider: 'phone', providers: ['phone'] },
        user_metadata: {},
        identities: [],
        created_at: iso,
        updated_at: iso,
        is_anonymous: false,
      },
    };
  }

  const cors = (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info, x-supabase-api-version');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Vary', 'Origin');
  };
  const send = (res: ServerResponse, status: number, body?: unknown) => {
    res.statusCode = status;
    if (body === undefined) return res.end();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  const readJson = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString();
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  };
  const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

  const server = createServer((req, res) => {
    void (async () => {
      cors(req, res);
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      if (req.method === 'OPTIONS') return send(res, 204);
      try {
        if (url.pathname === '/health') return send(res, 200, { status: 'ok' });
        if (url.pathname === '/auth/v1/.well-known/jwks.json') return send(res, 200, { keys: [jwk] });

        if (req.method === 'POST' && url.pathname === '/auth/v1/otp') {
          const body = await readJson(req);
          if (digits(body.phone).length < 8) return send(res, 422, { code: 422, error_code: 'validation_failed', msg: 'Invalid phone' });
          return send(res, 200, { message_id: uuidv7() });
        }
        if (req.method === 'POST' && url.pathname === '/auth/v1/verify') {
          const body = await readJson(req);
          if (body.token !== TEST_OTP) {
            return send(res, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
          }
          return send(res, 200, await session(await userFor(digits(body.phone))));
        }
        if (req.method === 'POST' && url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
          const body = await readJson(req);
          const id = refreshTokens.get(String(body.refresh_token));
          const phone = [...usersByPhone].find(([, uid]) => uid === id)?.[0];
          if (!id || !phone) return send(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
          refreshTokens.delete(String(body.refresh_token));
          return send(res, 200, await session({ id, phone }));
        }
        if (req.method === 'POST' && url.pathname === '/auth/v1/logout') return send(res, 204);
        if (req.method === 'GET' && url.pathname === '/auth/v1/user') {
          const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
          const user = token ? accessTokens.get(token) : undefined;
          if (!user) return send(res, 401, { code: 401, msg: 'invalid JWT' });
          return send(res, 200, { id: user.id, aud: 'authenticated', role: 'authenticated', phone: user.phone });
        }
        send(res, 404, { code: 404, msg: 'not found' });
      } catch (error) {
        console.error('[fake-supabase]', error);
        send(res, 500, { code: 500, msg: 'fake supabase error' });
      }
    })();
  });
  server.on('close', () => void db.end());
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return server;
}
