import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDestinationOriginalName1760000000024 implements MigrationInterface {
  name = 'AddDestinationOriginalName1760000000024';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "destinations" ADD COLUMN "original_name" varchar(255)`,
    );
    await queryRunner.query(
      `UPDATE "destinations" SET "original_name" = "name" WHERE "original_name" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "destinations" DROP COLUMN "original_name"`,
    );
  }
}
