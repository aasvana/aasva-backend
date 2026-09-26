import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairTravelVoucherSequences1760000000038 implements MigrationInterface {
  name = 'RepairTravelVoucherSequences1760000000038';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "travel_voucher_sequences" sequence
      SET "current_value" = COALESCE(matches."max_value", 0)
      FROM (
        SELECT sequence_inner."tenant_id",
          MAX(NULLIF(regexp_replace(v."voucher_no", '^.*?([0-9]+)([^0-9]*)$', '\\1'), '')::integer) AS "max_value"
        FROM "travel_voucher_sequences" sequence_inner
        JOIN "confirmation_vouchers" v ON v."tenant_id" = sequence_inner."tenant_id"
        GROUP BY sequence_inner."tenant_id"
      ) matches
      WHERE sequence."tenant_id" = matches."tenant_id"
    `);
  }

  async down(): Promise<void> {}
}
