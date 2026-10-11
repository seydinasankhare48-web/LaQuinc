import type { Request } from 'express';
import type { AuthClaims } from '../auth/jwt-verifier';
import type { TenantContext } from '@laquinc/db';

export type AppRequest = Request & {
  auth?: AuthClaims;
  tenant?: Required<TenantContext>;
};
