import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  modules: string[];
}

/**
 * Injects the authenticated user (from the JWT payload) into a handler.
 * Only works on routes protected by the global JWT auth guard.
 *
 * @example
 * getMe(@CurrentUser() user: JwtUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    return request.user;
  },
);
