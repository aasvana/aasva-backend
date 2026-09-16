import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';
const TRIAL_DAYS = 90;

export class AddTenantSubscription1760000000018 implements MigrationInterface {
  name = 'AddTenantSubscription1760000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD "subscription_status" character varying(20) NOT NULL DEFAULT 'trial'
    `);
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD "subscription_plan" character varying(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD "subscription_paid_until" timestamptz
    `);

    await queryRunner.query(`
      UPDATE "tenants"
        SET "subscription_paid_until" = now() + interval '${TRIAL_DAYS} days'
        WHERE "subscription_status" = 'trial'
    `);

    await queryRunner.query(`
      UPDATE "tenants"
        SET "subscription_status" = 'active',
            "subscription_plan" = 'lifetime',
            "subscription_paid_until" = NULL
        WHERE "id" = '${DEFAULT_TENANT_ID}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "subscription_paid_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "subscription_plan"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "subscription_status"`,
    );
  }
}
