import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOauthIdentitiesTable1760000000002 implements MigrationInterface {
  name = 'CreateOauthIdentitiesTable1760000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "password_hash" DROP NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_identities" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "provider" character varying(50) NOT NULL,
        "provider_user_id" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "email_verified" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_identities" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oauth_identities_provider_provider_user_id" UNIQUE ("provider", "provider_user_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_oauth_identities_user_id"
        ON "oauth_identities" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "oauth_identities"
        ADD CONSTRAINT "FK_oauth_identities_user"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "oauth_identities"`);

    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "password_hash" SET NOT NULL
    `);
  }
}
