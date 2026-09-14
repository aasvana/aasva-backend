import { SetMetadata } from '@nestjs/common';
import { Role } from '../../roles/enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles (OR logic).
 * Roles are read from the JWT payload, so they take effect on next login.
 *
 * @example
 * @Roles(Role.ADMIN)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
