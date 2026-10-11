import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { parseEnv } from './config/env';
import { configureApp } from './setup';

async function bootstrap() {
  const env = parseEnv(process.env);
  const app = await NestFactory.create(AppModule);
  configureApp(app, env);
  await app.listen(env.PORT);
}

void bootstrap();
