import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDestinationHotelPermissions1760000000022 implements MigrationInterface {
  name = 'SeedDestinationHotelPermissions1760000000022';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const resource of ['destinations', 'hotels']) {
      for (const action of ['read', 'create']) {
        const name = `${resource}:${action}`;
        await queryRunner.query(
          `INSERT INTO "permissions" ("name", "description") VALUES ($1, $2) ON CONFLICT ("name") DO NOTHING`,
          [name, `${resource} ${action}`],
        );
      }
    }
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id") SELECT r.id, p.id FROM "roles" r CROSS JOIN "permissions" p WHERE r.name IN ('systemadmin', 'superadmin', 'admin') AND p.name IN ('destinations:read', 'destinations:create', 'hotels:read', 'hotels:create') ON CONFLICT DO NOTHING`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT id FROM "permissions" WHERE name IN ('destinations:read', 'destinations:create', 'hotels:read', 'hotels:create'))`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE name IN ('destinations:read', 'destinations:create', 'hotels:read', 'hotels:create')`,
    );
  }
}
