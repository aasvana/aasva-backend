import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Restricts a route to users holding ANY of the given permissions (OR logic).
 * Permissions are read from the JWT payload, so they take effect on next login.
 *
 * @example
 * @Permissions('users:read')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
