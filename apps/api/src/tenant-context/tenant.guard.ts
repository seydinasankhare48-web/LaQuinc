import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MembershipRole } from '@laquinc/db';
import { REQUIRE_TENANT, ROLES } from '../auth/decorators';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import type { AppRequest } from '../common/request';
import { TenantContextService } from './tenant-context.service';

/**
 * Pour les routes `@RequireTenant()` ou `@Roles(...)` : résout la membership, puis contrôle le rôle
 * côté serveur (l'interface ne fait que masquer).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const roles = this.reflector.getAllAndOverride<MembershipRole[] | undefined>(ROLES, targets);
    const requireTenant = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_TENANT, targets);
    if (!roles && !requireTenant) return true;

    const req = context.switchToHttp().getRequest<AppRequest>();
    if (!req.auth) throw new UnauthorizedError('MISSING_TOKEN');
    const header = req.headers['x-tenant-id'];
    const requested = Array.isArray(header) ? header[0] : header;
    const tenant = await this.tenantContext.resolve(req.auth.userId, requested);
    if (roles && !roles.includes(tenant.role)) throw new ForbiddenError('INSUFFICIENT_ROLE');
    req.tenant = tenant;
    return true;
  }
}
