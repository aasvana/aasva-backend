import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export class AddTenantScoping1760000000017 implements MigrationInterface {
  name = 'AddTenantScoping1760000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "tenants" ("id", "name", "slug")
      VALUES ('${DEFAULT_TENANT_ID}', 'Aasvana', 'aasvana')
    `);

    await queryRunner.query(`ALTER TABLE "users" ADD "tenant_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "company_settings" ADD "tenant_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "confirmation_vouchers" ADD "tenant_id" uuid`,
    );

    await queryRunner.query(
      `UPDATE "users" SET "tenant_id" = '${DEFAULT_TENANT_ID}'`,
    );
    await queryRunner.query(
      `UPDATE "company_settings" SET "tenant_id" = '${DEFAULT_TENANT_ID}'`,
    );
    await queryRunner.query(
      `UPDATE "confirmation_vouchers" SET "tenant_id" = '${DEFAULT_TENANT_ID}'`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_settings" ALTER COLUMN "tenant_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "confirmation_vouchers" ALTER COLUMN "tenant_id" SET NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "company_settings"
        ADD CONSTRAINT "FK_company_settings_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers"
        ADD CONSTRAINT "FK_confirmation_vouchers_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_confirmation_vouchers_tenant_id" ON "confirmation_vouchers" ("tenant_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "company_settings"
        ADD CONSTRAINT "UQ_company_settings_tenant" UNIQUE ("tenant_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers"
        DROP CONSTRAINT "UQ_confirmation_vouchers_voucher_no"
    `);
    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers"
        ADD CONSTRAINT "UQ_confirmation_vouchers_tenant_voucher" UNIQUE ("tenant_id", "voucher_no")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers"
        DROP CONSTRAINT "UQ_confirmation_vouchers_tenant_voucher"
    `);
    await queryRunner.query(`
      ALTER TABLE "confirmation_vouchers"
        ADD CONSTRAINT "UQ_confirmation_vouchers_voucher_no" UNIQUE ("voucher_no")
    `);
    await queryRunner.query(`
      ALTER TABLE "company_settings"
        DROP CONSTRAINT "UQ_company_settings_tenant"
    `);
    await queryRunner.query(`DROP INDEX "IDX_confirmation_vouchers_tenant_id"`);
    await queryRunner.query(`DROP INDEX "IDX_users_tenant_id"`);
    await queryRunner.query(
      `ALTER TABLE "confirmation_vouchers" DROP CONSTRAINT "FK_confirmation_vouchers_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_settings" DROP CONSTRAINT "FK_company_settings_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "confirmation_vouchers" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_settings" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tenant_id"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
