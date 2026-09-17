import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTravelMasterDataSubModules1760000000029 implements MigrationInterface {
  name = 'AddTravelMasterDataSubModules1760000000029';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "modules" SET "sub_modules" = (SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements_text("sub_modules" || '["Destination", "Hotels", "Packages"]'::jsonb) AS value) WHERE "name" = 'Travel'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "modules" SET "sub_modules" = COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements_text("sub_modules") AS value WHERE value NOT IN ('Destination', 'Hotels', 'Packages')), '[]'::jsonb) WHERE "name" = 'Travel'`,
    );
  }
}
