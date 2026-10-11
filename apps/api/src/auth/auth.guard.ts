import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnauthorizedError } from '../common/errors';
import type { AppRequest } from '../common/request';
import { JWT_VERIFIER } from '../tokens';
import { IS_PUBLIC } from './decorators';
import type { JwtVerifier } from './jwt-verifier';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JWT_VERIFIER) private readonly verifier: JwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AppRequest>();
    const header = req.headers.authorization;
    const match = header ? /^Bearer (.+)$/i.exec(header) : null;
    if (!match?.[1]) throw new UnauthorizedError('MISSING_TOKEN');
    req.auth = await this.verifier.verify(match[1]);
    return true;
  }
}
