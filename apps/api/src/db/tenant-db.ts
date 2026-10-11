import { Inject, Injectable } from '@nestjs/common';
import { withTenant, type Database, type TenantContext, type Tx } from '@laquinc/db';
import { DATABASE } from '../tokens';

/** Seul point d'accès à la base : chaque appel s'exécute dans une transaction qui porte le contexte tenant. */
@Injectable()
export class TenantDb {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(context: TenantContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return withTenant(this.db, context, fn);
  }
}
