import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export async function seedAdminUser(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  const userRepository = AppDataSource.getRepository(User);
  const roleRepository = AppDataSource.getRepository(Role);
  const tenantRepository = AppDataSource.getRepository(Tenant);

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

  const tenant = await tenantRepository.findOne({
    where: { id: DEFAULT_TENANT_ID },
  });
  if (!tenant) {
    throw new Error(
      'Default tenant not found. Run migrations (npm run migration:run) first.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = userRepository.create({
    email,
    firstName: 'Admin',
    lastName: 'User',
    passwordHash,
    tenantId: tenant.id,
    isActive: true,
    isEmailVerified: true,
    roles: [adminRole],
  });

  await userRepository.save(user);
  console.log(
    `[seed] Created admin user ${email} in tenant "${tenant.name}" (default password from ADMIN_PASSWORD env). Change it after first login.`,
  );
}
