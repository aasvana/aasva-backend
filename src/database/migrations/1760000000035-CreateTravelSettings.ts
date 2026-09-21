import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTravelSettings1760000000035 implements MigrationInterface {
  name = 'CreateTravelSettings1760000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "travel_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "voucher_prefix" character varying(100) NOT NULL DEFAULT '',
        "voucher_suffix" character varying(100) NOT NULL DEFAULT '',
        "invoice_prefix" character varying(100) NOT NULL DEFAULT 'INV-',
        "invoice_suffix" character varying(100) NOT NULL DEFAULT '1001',
        "default_currency" character varying(16) NOT NULL DEFAULT 'USD',
        "default_payment_type" character varying(100) NOT NULL DEFAULT 'Full Payment',
        "default_tax_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "general_details" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_travel_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_travel_settings_tenant" UNIQUE ("tenant_id"),
        CONSTRAINT "FK_travel_settings_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "travel_settings"');
  }
}
