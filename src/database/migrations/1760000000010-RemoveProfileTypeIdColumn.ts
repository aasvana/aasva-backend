import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProfileTypeIdColumn1760000000010 implements MigrationInterface {
  name = 'RemoveProfileTypeIdColumn1760000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_details"
        DROP CONSTRAINT "FK_user_details_profile_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_details"
        DROP COLUMN "profile_type_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_details"
        ADD COLUMN "profile_type_id" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "user_details"
        ADD CONSTRAINT "FK_user_details_profile_type"
        FOREIGN KEY ("profile_type_id") REFERENCES "profile_types" ("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }
}
