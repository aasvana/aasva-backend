import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceNumberingToTravelSettings1760000000036 implements MigrationInterface {
  name = 'AddInvoiceNumberingToTravelSettings1760000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "travel_settings" ADD "invoice_prefix" character varying(100) NOT NULL DEFAULT 'INV-'`);
    await queryRunner.query(`ALTER TABLE "travel_settings" ADD "invoice_suffix" character varying(100) NOT NULL DEFAULT '1001'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "travel_settings" DROP COLUMN "invoice_suffix"`);
    await queryRunner.query(`ALTER TABLE "travel_settings" DROP COLUMN "invoice_prefix"`);
  }
}
