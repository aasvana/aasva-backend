import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoicesSubModule1760000000020 implements MigrationInterface {
  name = 'AddInvoicesSubModule1760000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "modules"
       SET "sub_modules" = CASE
         WHEN NOT ("sub_modules" @> '["Invoices"]'::jsonb)
           THEN "sub_modules" || '["Invoices"]'::jsonb
         ELSE "sub_modules"
       END
       WHERE "name" = 'Accounting'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "modules"
       SET "sub_modules" = "sub_modules" - 'Invoices'
       WHERE "name" = 'Accounting'`,
    );
  }
}
