import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCompanySettingsPermissions1760000000014 implements MigrationInterface {
  name = 'SeedCompanySettingsPermissions1760000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, description] of [
      ['company:read', 'Company settings read'],
      ['company:update', 'Company settings update'],
    ] as const) {
      await queryRunner.query(
        `
        INSERT INTO "permissions" ("name", "description")
        VALUES ($1, $2)
        ON CONFLICT ("name") DO NOTHING
        `,
        [name, description],
      );
    }

    await queryRunner.query(`
      INSERT INTO "role_permissions" (role_id, permission_id)
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('systemadmin', 'superadmin', 'admin')
        AND p.name IN ('company:read', 'company:update')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE "permission_id" IN (
         SELECT "id" FROM "permissions"
         WHERE "name" IN ('company:read', 'company:update')
       )`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions"
       WHERE "name" IN ('company:read', 'company:update')`,
    );
  }
}
