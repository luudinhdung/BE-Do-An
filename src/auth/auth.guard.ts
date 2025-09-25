import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token =
      request.cookies?.token ||
      request.headers['authorization']?.replace('Bearer ', '');

    if (!token) return false;

    const user = await this.authService.verifyToken(token);
    if (!user) return false;

    request.user = user;
    return true;
  }
}
