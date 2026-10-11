import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import {
  membershipParamsSchema,
  updateMembershipRoleSchema,
  type UpdateMembershipRoleInput,
} from '@laquinc/validation';
import type { TenantContext } from '@laquinc/db';
import { Roles, Tenant } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { MembershipsService } from './memberships.service';

const idPipe = new ZodPipe(membershipParamsSchema);

@Controller('memberships')
export class MembershipsController {
  constructor(@Inject(MembershipsService) private readonly service: MembershipsService) {}

  @Get()
  @Roles('owner', 'manager')
  list(@Tenant() ctx: Required<TenantContext>) {
    return this.service.list(ctx);
  }

  @Patch(':id')
  @Roles('owner')
  updateRole(
    @Tenant() ctx: Required<TenantContext>,
    @Param(idPipe) params: { id: string },
    @Body(new ZodPipe(updateMembershipRoleSchema)) body: UpdateMembershipRoleInput,
  ) {
    return this.service.updateRole(ctx, params.id, body.role);
  }

  @Post(':id/archive')
  @Roles('owner')
  archive(@Tenant() ctx: Required<TenantContext>, @Param(idPipe) params: { id: string }) {
    return this.service.archive(ctx, params.id);
  }
}
