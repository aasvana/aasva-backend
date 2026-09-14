import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSuperadminFlag1760000000005 implements MigrationInterface {
  name = 'RemoveSuperadminFlag1760000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "is_superadmin"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "is_superadmin" boolean NOT NULL DEFAULT false
    `);
  }
}
