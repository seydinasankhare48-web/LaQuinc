import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { UnauthorizedError } from '../common/errors';

export interface AuthClaims {
  /** `sub` : identifiant Supabase Auth = `users.id`. */
  userId: string;
  /** Téléphone en E.164 (le JWT Supabase le fournit sans « + »). */
  phone?: string;
  /** Niveau d'assurance d'authentification : `aal1` ou `aal2` (MFA). */
  aal?: string;
}

export interface JwtVerifier {
  verify(token: string): Promise<AuthClaims>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePhone(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const digits = raw.replace(/\D/g, '');
  return digits ? `+${digits}` : undefined;
}

/**
 * Vérifie un JWT Supabase : signature (clés asymétriques via JWKS uniquement, HS256 refusé),
 * `iss`, `aud`, `exp`, puis `sub`.
 */
export class JoseJwtVerifier implements JwtVerifier {
  constructor(
    private readonly keys: JWTVerifyGetKey,
    private readonly issuer: string,
    private readonly audience: string,
  ) {}

  static fromSupabaseUrl(supabaseUrl: string, audience: string): JoseJwtVerifier {
    const base = supabaseUrl.replace(/\/+$/, '');
    const jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60_000,
    });
    return new JoseJwtVerifier(jwks, `${base}/auth/v1`, audience);
  }

  async verify(token: string): Promise<AuthClaims> {
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['ES256', 'RS256', 'EdDSA'],
        requiredClaims: ['sub', 'exp'],
      });
      if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) throw new Error('bad sub');
      return {
        userId: payload.sub,
        phone: normalizePhone(payload['phone']),
        aal: typeof payload['aal'] === 'string' ? payload['aal'] : undefined,
      };
    } catch {
      throw new UnauthorizedError('INVALID_TOKEN');
    }
  }
}
