import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTermsPermissions1760000000032 implements MigrationInterface {
  name = 'SeedTermsPermissions1760000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissionNames = [
      'terms:read',
      'terms:create',
      'terms:update',
      'terms:delete',
    ];

    for (const name of permissionNames) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("name", "description")
         VALUES ($1, $2)
         ON CONFLICT ("name") DO NOTHING`,
        [name, `Terms and conditions ${name.split(':')[1]}`],
      );
    }

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT r.id, p.id FROM "roles" r CROSS JOIN "permissions" p
       WHERE r.name IN ('systemadmin', 'superadmin', 'admin')
         AND p.name IN ('terms:read', 'terms:create', 'terms:update', 'terms:delete')
       ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE "permission_id" IN (
         SELECT "id" FROM "permissions"
         WHERE "name" IN ('terms:read', 'terms:create', 'terms:update', 'terms:delete')
       )`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions"
       WHERE "name" IN ('terms:read', 'terms:create', 'terms:update', 'terms:delete')`,
    );
  }
}
