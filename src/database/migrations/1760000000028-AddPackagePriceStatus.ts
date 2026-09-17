import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddPackagePriceStatus1760000000028 implements MigrationInterface {
  name = 'AddPackagePriceStatus1760000000028';
  async up(q: QueryRunner) {
    await q.query(
      `ALTER TABLE "itinerary_templates" ADD COLUMN "price" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await q.query(
      `ALTER TABLE "itinerary_templates" ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'active'`,
    );
  }
  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE "itinerary_templates" DROP COLUMN "status"`);
    await q.query(`ALTER TABLE "itinerary_templates" DROP COLUMN "price"`);
  }
}
