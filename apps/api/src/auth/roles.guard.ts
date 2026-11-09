
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { IS_PUBLIC_KEY, ROLES_KEY } from './roles.decorator';
import { User } from './user.schema';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @InjectModel(User.name)
    private readonly users: Model<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest();
    const authorization = req.headers?.authorization;

    if (typeof authorization !== 'string') {
      throw new UnauthorizedException('Sign in required');
    }

    const bearerMatch = /^Bearer\s+(\S+)$/i.exec(authorization.trim());

    if (!bearerMatch) {
      throw new UnauthorizedException('Sign in required');
    }

    const token = bearerMatch[1];

    let claims: Record<string, unknown>;

    try {
      claims = await this.jwt.verifyAsync<Record<string, unknown>>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const subject = claims.sub;

    if (
      typeof subject !== 'string' ||
      !/^[a-fA-F0-9]{24}$/.test(subject)
    ) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // The database is authoritative for current account status and role.
    // Database failures intentionally propagate rather than being
    // incorrectly reported as invalid JWTs.
    const account = await this.users
      .findById(subject)
      .select('_id email role active')
      .exec();

    if (!account || account.active !== true) {
      throw new UnauthorizedException('Account is unavailable');
    }

    req.user = {
      ...claims,
      sub: String(account._id),
      email: account.email,
      role: account.role,
    };

    const roles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (roles?.length && !roles.includes(account.role)) {
      throw new ForbiddenException(
        'Your account cannot access this action',
      );
    }

    return true;
  }
}

export { AuthGuard as RolesGuard };
