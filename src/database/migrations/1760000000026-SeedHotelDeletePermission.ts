import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedHotelDeletePermission1760000000026 implements MigrationInterface {
  name = 'SeedHotelDeletePermission1760000000026';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "permissions" ("name", "description") VALUES ('hotels:delete', 'Delete shared hotels') ON CONFLICT ("name") DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id") SELECT r.id, p.id FROM "roles" r CROSS JOIN "permissions" p WHERE r.name IN ('systemadmin', 'superadmin', 'admin') AND p.name = 'hotels:delete' ON CONFLICT DO NOTHING`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT id FROM "permissions" WHERE name = 'hotels:delete')`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE name = 'hotels:delete'`,
    );
  }
}
