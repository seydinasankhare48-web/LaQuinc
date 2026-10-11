import { Controller, Get, Inject } from '@nestjs/common';
import { AuthUser } from '../auth/decorators';
import type { AuthClaims } from '../auth/jwt-verifier';
import { UsersService } from './users.service';

@Controller('me')
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

  @Get()
  me(@AuthUser() auth: AuthClaims) {
    return this.service.me(auth);
  }
}
