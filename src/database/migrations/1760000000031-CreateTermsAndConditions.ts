import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTermsAndConditions1760000000031 implements MigrationInterface {
  name = 'CreateTermsAndConditions1760000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "terms_and_conditions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "title" character varying(255),
        "content" text NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_terms_and_conditions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_terms_conditions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_terms_conditions_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_terms_conditions_tenant_id"
        ON "terms_and_conditions" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_terms_conditions_tenant_sort"
        ON "terms_and_conditions" ("tenant_id", "sort_order")
    `);

    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers"
        ADD COLUMN "terms_snapshot" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers" DROP COLUMN "terms_snapshot"
    `);
    await queryRunner.query(`DROP TABLE "terms_and_conditions"`);
  }
}
