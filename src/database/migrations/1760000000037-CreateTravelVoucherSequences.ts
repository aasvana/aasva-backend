import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTravelVoucherSequences1760000000037 implements MigrationInterface {
  name = 'CreateTravelVoucherSequences1760000000037';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "travel_voucher_sequences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "current_value" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_travel_voucher_sequences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_travel_voucher_sequences_tenant" UNIQUE ("tenant_id"),
        CONSTRAINT "FK_travel_voucher_sequences_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      INSERT INTO "travel_voucher_sequences" ("tenant_id", "current_value")
      SELECT t."id", COALESCE(MAX(CASE
        WHEN s."voucher_prefix" <> '' AND v."voucher_no" LIKE s."voucher_prefix" || '%'
          AND substring(v."voucher_no" FROM length(s."voucher_prefix") + 1) ~ '^[0-9]+$'
        THEN substring(v."voucher_no" FROM length(s."voucher_prefix") + 1)::integer
        ELSE NULL END), 0)
      FROM "tenants" t
      LEFT JOIN "travel_settings" s ON s."tenant_id" = t."id"
      LEFT JOIN "confirmation_vouchers" v ON v."tenant_id" = t."id"
      GROUP BY t."id"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "travel_voucher_sequences"');
  }
}
