import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRolesAndPermissions1760000000001 implements MigrationInterface {
  name = 'SeedRolesAndPermissions1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissionNames = [
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'roles:read',
      'roles:create',
      'roles:update',
      'roles:delete',
      'permissions:read',
      'permissions:create',
      'permissions:update',
      'permissions:delete',
    ];

    for (const name of permissionNames) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("name", "description") VALUES ($1, $2)`,
        [name, null],
      );
    }

    await queryRunner.query(
      `INSERT INTO "roles" ("name", "description") VALUES ($1, $2)`,
      ['systemadmin', 'System administrator with full access'],
    );
    await queryRunner.query(
      `INSERT INTO "roles" ("name", "description") VALUES ($1, $2)`,
      ['superadmin', 'Super administrator with full access'],
    );
    await queryRunner.query(
      `INSERT INTO "roles" ("name", "description") VALUES ($1, $2)`,
      ['admin', 'Administrator with full access'],
    );
    await queryRunner.query(
      `INSERT INTO "roles" ("name", "description") VALUES ($1, $2)`,
      ['user', 'Regular application user'],
    );

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT r.id, p.id FROM "roles" r CROSS JOIN "permissions" p
       WHERE r.name IN ('systemadmin', 'superadmin', 'admin')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "roles" WHERE "name" IN ('systemadmin', 'superadmin', 'admin', 'user')`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE "name" LIKE '%:%'`,
    );
  }
}
