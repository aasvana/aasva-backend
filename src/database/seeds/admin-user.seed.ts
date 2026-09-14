import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

/**
 * Creates (or re-asserts) the bootstrap admin user from ADMIN_EMAIL /
 * ADMIN_PASSWORD env vars. Idempotent: existing users are left untouched
 * unless their email changes.
 */
export async function seedAdminUser(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  const userRepository = AppDataSource.getRepository(User);
  const roleRepository = AppDataSource.getRepository(Role);

  const existing = await userRepository.findOne({
    where: { email },
    relations: { roles: true },
  });

  if (existing) {
    console.log(`[seed] Admin user ${email} already exists, skipping.`);
    return;
  }

  const adminRole = await roleRepository.findOne({ where: { name: 'admin' } });
  if (!adminRole) {
    throw new Error(
      'The "admin" role does not exist. Run migrations (npm run migration:run) first.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = userRepository.create({
    email,
    firstName: 'Admin',
    lastName: 'User',
    passwordHash,
    isActive: true,
    isEmailVerified: true,
    roles: [adminRole],
  });

  await userRepository.save(user);
  console.log(
    `[seed] Created admin user ${email} (default password from ADMIN_PASSWORD env). Change it after first login.`,
  );
}
