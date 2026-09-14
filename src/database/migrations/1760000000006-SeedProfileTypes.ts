import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedProfileTypes1760000000006 implements MigrationInterface {
  name = 'SeedProfileTypes1760000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "profile_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(50) NOT NULL,
        "key" character varying(50) NOT NULL,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profile_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_profile_types_name" UNIQUE ("name"),
        CONSTRAINT "UQ_profile_types_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "profile_type_id" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_profile_type"
        FOREIGN KEY ("profile_type_id") REFERENCES "profile_types" ("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    const profileTypes = [
      { name: 'Doctor', key: 'doctor', description: 'Healthcare professional' },
      { name: 'Manager', key: 'manager', description: 'General management' },
      {
        name: 'Accountant',
        key: 'accountant',
        description: 'Accounting and finance',
      },
      {
        name: 'Receptionist',
        key: 'receptionist',
        description: 'Front desk operations',
      },
      {
        name: 'Travel Agent',
        key: 'travel-agent',
        description: 'Travel bookings and itineraries',
      },
      {
        name: 'Delivery Partner',
        key: 'delivery-partner',
        description: 'Delivery and logistics',
      },
      {
        name: 'Store Manager',
        key: 'store-manager',
        description: 'Store and POS management',
      },
      {
        name: 'Ecommerce User',
        key: 'ecommerce-user',
        description: 'Online store customer',
      },
      {
        name: 'Healthcare Admin',
        key: 'healthcare-admin',
        description: 'Healthcare administration',
      },
      {
        name: 'System Admin',
        key: 'systemadmin',
        description: 'Full system access',
      },
    ];

    for (const pt of profileTypes) {
      await queryRunner.query(
        `INSERT INTO "profile_types" ("name", "key", "description") VALUES ($1, $2, $3)`,
        [pt.name, pt.key, pt.description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_profile_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "profile_type_id"`,
    );
    await queryRunner.query(`DROP TABLE "profile_types"`);
  }
}
