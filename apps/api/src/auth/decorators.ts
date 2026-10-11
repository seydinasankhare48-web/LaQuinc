import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '@laquinc/db';
import type { AppRequest } from '../common/request';

export const IS_PUBLIC = 'isPublic';
export const REQUIRE_TENANT = 'requireTenant';
export const ROLES = 'roles';
export const AUTHENTICATED = 'authenticated';

/** Route sans authentification. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Route pour un utilisateur connecté, sans tenant actif (profil, inscription). */
export const Authenticated = () => SetMetadata(AUTHENTICATED, true);
/** Route qui travaille dans un tenant (membership vérifiée) sans restriction de rôle. */
export const RequireTenant = () => SetMetadata(REQUIRE_TENANT, true);
/** Route réservée à certains rôles (implique un tenant). */
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES, roles);

export const AuthUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<AppRequest>().auth;
});

export const Tenant = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<AppRequest>().tenant;
});
