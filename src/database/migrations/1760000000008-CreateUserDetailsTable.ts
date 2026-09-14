import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserDetailsTable1760000000008 implements MigrationInterface {
  name = 'CreateUserDetailsTable1760000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_details" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "date_of_birth" date,
        "phone" character varying(20),
        "address" character varying(255),
        "details" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_details" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_details_user_id" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "user_details"
        ADD CONSTRAINT "FK_user_details_user"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      INSERT INTO "user_details" ("user_id", "details")
      SELECT "id", '{}' FROM "users"
    `);

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "module_overrides"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "module_overrides" jsonb NULL`,
    );
    await queryRunner.query(`DROP TABLE "user_details"`);
  }
}
