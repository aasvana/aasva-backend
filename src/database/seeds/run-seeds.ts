import { AppDataSource } from '../data-source';
import { seedAdminUser } from './admin-user.seed';

async function runSeeds(): Promise<void> {
  await AppDataSource.initialize();
  console.log('[seed] Database connected.');

  try {
    await seedAdminUser();
  } finally {
    await AppDataSource.destroy();
  }
}

void runSeeds().catch((error: unknown) => {
  console.error('[seed] Failed:', error);
  process.exitCode = 1;
});
