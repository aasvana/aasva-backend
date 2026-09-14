import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveProfileTypeToUserDetails1760000000009 implements MigrationInterface {
  name = 'MoveProfileTypeToUserDetails1760000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      UPDATE "user_details"
      SET "profile_type_id" = "users"."profile_type_id"
      FROM "users"
      WHERE "users"."id" = "user_details"."user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "profile_type_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "profile_type_id" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_profile_type"
        FOREIGN KEY ("profile_type_id") REFERENCES "profile_types" ("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "profile_type_id" = "user_details"."profile_type_id"
      FROM "user_details"
      WHERE "users"."id" = "user_details"."user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_details"
        DROP COLUMN "profile_type_id"
    `);
  }
}
