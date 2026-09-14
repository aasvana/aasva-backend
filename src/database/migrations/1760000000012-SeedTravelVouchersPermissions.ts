import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTravelVouchersPermissions1760000000012 implements MigrationInterface {
  name = 'SeedTravelVouchersPermissions1760000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissionNames = [
      'vouchers:read',
      'vouchers:create',
      'vouchers:update',
      'vouchers:delete',
    ];

    for (const name of permissionNames) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("name", "description")
         VALUES ($1, $2)
         ON CONFLICT ("name") DO NOTHING`,
        [name, `Travel confirmation voucher ${name.split(':')[1]}`],
      );
    }

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT r.id, p.id FROM "roles" r CROSS JOIN "permissions" p
       WHERE r.name IN ('systemadmin', 'superadmin', 'admin')
         AND p.name IN ('vouchers:read', 'vouchers:create', 'vouchers:update', 'vouchers:delete')
       ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE "permission_id" IN (
         SELECT "id" FROM "permissions"
         WHERE "name" IN ('vouchers:read', 'vouchers:create', 'vouchers:update', 'vouchers:delete')
       )`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions"
       WHERE "name" IN ('vouchers:read', 'vouchers:create', 'vouchers:update', 'vouchers:delete')`,
    );
  }
}
