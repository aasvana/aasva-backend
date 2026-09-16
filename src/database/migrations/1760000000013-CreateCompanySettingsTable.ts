import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanySettingsTable1760000000013 implements MigrationInterface {
  name = 'CreateCompanySettingsTable1760000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "company_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "short_name" character varying(64) NOT NULL DEFAULT '',
        "email" character varying(255) NOT NULL DEFAULT '',
        "phone" character varying(64) NOT NULL DEFAULT '',
        "address" character varying(500) NOT NULL DEFAULT '',
        "website" character varying(255) NOT NULL DEFAULT '',
        "tagline" character varying(500) NOT NULL DEFAULT '',
        "logo" text,
        "currency" character varying(16) NOT NULL DEFAULT 'USD',
        "gstin" character varying(64) NOT NULL DEFAULT '',
        "pan" character varying(64) NOT NULL DEFAULT '',
        "tan" character varying(64) NOT NULL DEFAULT '',
        "cin" character varying(64) NOT NULL DEFAULT '',
        "default_tax_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "business_type" character varying(64) NOT NULL DEFAULT '',
        "incorporation_date" character varying(16) NOT NULL DEFAULT '',
        "authorized_signatory" character varying(200) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "company_settings" ("name", "short_name", "email", "phone", "address", "website", "tagline", "logo", "business_type", "authorized_signatory")
      VALUES (
        'Aasvana',
        'Xm',
        'admin@aasvana.com',
        '+91 90000 00000',
        'Aasvana HQ',
        'https://www.aasvana.com',
        'Aasvana is a powerful and flexible web application template designed for building modern, responsive, and user-friendly applications.',
        '/images/logo-light.svg',
        'Private Limited',
        'Aquib Shahbaz'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "company_settings"`);
  }
}
