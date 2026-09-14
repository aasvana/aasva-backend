import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentNameToConfirmationVouchers1760000000015 implements MigrationInterface {
  name = 'AddAgentNameToConfirmationVouchers1760000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers"
        ADD COLUMN "agent_name" character varying(255) NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      UPDATE "confirmation_vouchers"
        SET "agent_name" = COALESCE(data->>'agentName', '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers"
        DROP COLUMN "agent_name"
    `);
  }
}
