import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileTypeConfigAndUserModuleOverrides1760000000007 implements MigrationInterface {
  name = 'AddProfileTypeConfigAndUserModuleOverrides1760000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "profile_types"
        ADD COLUMN "config" jsonb NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "module_overrides" jsonb NULL
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Healthcare', 'Accounting', 'Auditing', 'Analytics',
          'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'doctor'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Dashboard', 'Accounting', 'Auditing', 'Analytics',
          'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'manager'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Accounting', 'Auditing', 'Analytics',
          'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'accountant'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Dashboard', 'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'receptionist'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Travel', 'Accounting', 'Auditing', 'Analytics',
          'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'travel-agent'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Delivery', 'Accounting', 'Auditing', 'Analytics',
          'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'delivery-partner'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Store', 'Accounting', 'Auditing', 'Analytics',
          'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'store-manager'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Store', 'Accounting', 'Auditing', 'Analytics',
          'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'ecommerce-user'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Healthcare', 'Accounting', 'Auditing', 'Analytics',
          'Customers', 'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'healthcare-admin'
    `);

    await queryRunner.query(`
      UPDATE "profile_types"
      SET "config" = jsonb_build_object(
        'modules', jsonb_build_array(
          'Dashboard', 'Accounting', 'Auditing', 'Travel', 'Delivery',
          'Healthcare', 'Store', 'Analytics', 'Customers',
          'User Requests', 'Help Center', 'Teams Meet'
        )
      )
      WHERE "key" = 'systemadmin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "module_overrides"`,
    );
    await queryRunner.query(`ALTER TABLE "profile_types" DROP COLUMN "config"`);
  }
}
