import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDestinationDeletePermission1760000000025 implements MigrationInterface {
  name = 'SeedDestinationDeletePermission1760000000025';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "permissions" ("name", "description") VALUES ('destinations:delete', 'Delete shared destinations') ON CONFLICT ("name") DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id") SELECT r.id, p.id FROM "roles" r CROSS JOIN "permissions" p WHERE r.name IN ('systemadmin', 'superadmin', 'admin') AND p.name = 'destinations:delete' ON CONFLICT DO NOTHING`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT id FROM "permissions" WHERE name = 'destinations:delete')`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE name = 'destinations:delete'`,
    );
  }
}
