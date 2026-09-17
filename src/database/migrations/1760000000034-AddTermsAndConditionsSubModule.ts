import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTermsAndConditionsSubModule1760000000034 implements MigrationInterface {
  name = 'AddTermsAndConditionsSubModule1760000000034';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "modules" SET "sub_modules" = (SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements_text("sub_modules" || '["Terms & Conditions"]'::jsonb) AS value) WHERE "name" = 'Travel'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "modules" SET "sub_modules" = COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements_text("sub_modules") AS value WHERE value NOT IN ('Terms & Conditions')), '[]'::jsonb) WHERE "name" = 'Travel'`,
    );
  }
}
