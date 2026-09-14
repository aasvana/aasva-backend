import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConfirmationVouchersTable1760000000011 implements MigrationInterface {
  name = 'CreateConfirmationVouchersTable1760000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "confirmation_vouchers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "voucher_no" character varying(64) NOT NULL,
        "customer_name" character varying(255) NOT NULL,
        "company_name" character varying(255) NOT NULL DEFAULT '',
        "payment_type" character varying(64) NOT NULL DEFAULT '',
        "journey_date" timestamptz,
        "data" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_confirmation_vouchers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_confirmation_vouchers_voucher_no" UNIQUE ("voucher_no")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_confirmation_vouchers_customer_name"
        ON "confirmation_vouchers" ("customer_name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_confirmation_vouchers_journey_date"
        ON "confirmation_vouchers" ("journey_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "confirmation_vouchers"`);
  }
}
