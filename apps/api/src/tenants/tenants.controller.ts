import { Body, Controller, Get, Inject, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  createTenantSchema,
  updateTenantSchema,
  type CreateTenantInput,
  type UpdateTenantInput,
} from '@laquinc/validation';
import type { TenantContext } from '@laquinc/db';
import { AuthUser, Authenticated, RequireTenant, Roles, Tenant } from '../auth/decorators';
import type { AuthClaims } from '../auth/jwt-verifier';
import { ZodPipe } from '../common/zod.pipe';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(@Inject(TenantsService) private readonly service: TenantsService) {}

  /** Inscription : pas de tenant encore, seulement un utilisateur authentifié. */
  @Post()
  @Authenticated()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@AuthUser() auth: AuthClaims, @Body(new ZodPipe(createTenantSchema)) body: CreateTenantInput) {
    return this.service.create(auth, body);
  }

  @Get('current')
  @RequireTenant()
  current(@Tenant() ctx: Required<TenantContext>) {
    return this.service.getCurrent(ctx);
  }

  @Patch('current')
  @Roles('owner')
  update(@Tenant() ctx: Required<TenantContext>, @Body(new ZodPipe(updateTenantSchema)) body: UpdateTenantInput) {
    return this.service.updateCurrent(ctx, body);
  }
}
