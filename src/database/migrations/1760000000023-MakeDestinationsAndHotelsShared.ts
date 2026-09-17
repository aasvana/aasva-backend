import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDestinationsAndHotelsShared1760000000023 implements MigrationInterface {
  name = 'MakeDestinationsAndHotelsShared1760000000023';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hotels" DROP CONSTRAINT IF EXISTS "UQ_hotels_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotels" DROP CONSTRAINT IF EXISTS "FK_hotels_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "destinations" DROP CONSTRAINT IF EXISTS "UQ_destinations_fingerprint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "destinations" DROP CONSTRAINT IF EXISTS "FK_destinations_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotels" DROP COLUMN IF EXISTS "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "destinations" DROP COLUMN IF EXISTS "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "destinations" ADD CONSTRAINT "UQ_destinations_fingerprint" UNIQUE ("fingerprint")`,
    );
    await queryRunner.query(
      `ALTER TABLE "hotels" ADD CONSTRAINT "UQ_hotels_name" UNIQUE ("destination_id", "normalized_name")`,
    );
  }

  async down(): Promise<void> {}
}
