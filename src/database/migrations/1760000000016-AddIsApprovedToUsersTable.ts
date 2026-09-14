import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsApprovedToUsersTable1760000000016 implements MigrationInterface {
  name = 'AddIsApprovedToUsersTable1760000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "is_approved" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "is_approved" = true
      WHERE id IN (
        SELECT ur.user_id
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name IN ('systemadmin', 'superadmin', 'admin')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "is_approved"
    `);
  }
}
