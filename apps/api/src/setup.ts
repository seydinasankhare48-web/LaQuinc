import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import type { Env } from './config/env';

/** Configuration HTTP commune à `main.ts` et aux tests. */
export function configureApp(app: INestApplication, env: Pick<Env, 'CORS_ORIGINS' | 'TRUST_PROXY'>): void {
  // Sans proxy de confiance, req.ip = IP du client ; avec N proxys, N sauts de X-Forwarded-For sont crus.
  app.getHttpAdapter().getInstance().set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());
  app.enableCors({
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Tenant-Id'],
  });
}
