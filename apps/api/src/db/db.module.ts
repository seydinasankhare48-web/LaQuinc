import { Global, Module } from '@nestjs/common';
import { createDb } from '@laquinc/db';
import type { Env } from '../config/env';
import { DATABASE, ENV } from '../tokens';
import { TenantDb } from './tenant-db';

@Global()
@Module({
  providers: [
    { provide: DATABASE, inject: [ENV], useFactory: (env: Env) => createDb(env.DATABASE_URL) },
    TenantDb,
  ],
  exports: [DATABASE, TenantDb],
})
export class DbModule {}
