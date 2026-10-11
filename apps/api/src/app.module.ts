import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthGuard } from './auth/auth.guard';
import { JoseJwtVerifier } from './auth/jwt-verifier';
import { DomainErrorFilter } from './common/domain-error.filter';
import { DbModule } from './db/db.module';
import { HealthController } from './health.controller';
import { MembershipsModule } from './memberships/memberships.module';
import { ENV, JWT_VERIFIER } from './tokens';
import { TenantContextService } from './tenant-context/tenant-context.service';
import { TenantGuard } from './tenant-context/tenant.guard';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from './config/config.module';
import type { Env } from './config/env';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      skipIf: () => process.env.RATE_LIMIT_DISABLED === 'true',
    }),
    ConfigModule,
    DbModule,
    AuditModule,
    TenantsModule,
    MembershipsModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: JWT_VERIFIER,
      inject: [ENV],
      useFactory: (env: Env) => JoseJwtVerifier.fromSupabaseUrl(env.SUPABASE_URL, env.JWT_AUDIENCE),
    },
    TenantContextService,
    // Ordre : limitation de débit, authentification, puis tenant + rôle.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
