import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedModules1760000000004 implements MigrationInterface {
  name = 'SeedModules1760000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "modules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "page_key" character varying(100) NOT NULL,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_modules" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_modules_name" UNIQUE ("name"),
        CONSTRAINT "UQ_modules_page_key" UNIQUE ("page_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "role_modules" (
        "role_id" uuid NOT NULL,
        "module_id" uuid NOT NULL,
        CONSTRAINT "PK_role_modules" PRIMARY KEY ("role_id", "module_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "role_modules"
        ADD CONSTRAINT "FK_role_modules_role"
        FOREIGN KEY ("role_id") REFERENCES "roles" ("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "role_modules"
        ADD CONSTRAINT "FK_role_modules_module"
        FOREIGN KEY ("module_id") REFERENCES "modules" ("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    const modules = [
      {
        name: 'Dashboard',
        pageKey: 'dashboard',
        description: 'The dashboard home page.',
      },
      {
        name: 'Accounting',
        pageKey: 'accounting',
        description: 'Invoices, bills, expenses, banking and reports.',
      },
      {
        name: 'Auditing',
        pageKey: 'auditing',
        description: 'Activity logs, audit trail and login history.',
      },
      {
        name: 'Travel',
        pageKey: 'travel',
        description: 'Customers, itineraries, bookings and vouchers.',
      },
      {
        name: 'Delivery',
        pageKey: 'delivery',
        description: 'Deliveries, dispatch, partners, zones and charges.',
      },
      {
        name: 'Healthcare',
        pageKey: 'healthcare',
        description: 'Patients, appointments, prescriptions and pharmacy.',
      },
      {
        name: 'Store',
        pageKey: 'store',
        description: 'Outlets, products, inventory, POS and sales.',
      },
      {
        name: 'Analytics',
        pageKey: 'analytics',
        description: 'Charts and reports across every module.',
      },
      {
        name: 'Customers',
        pageKey: 'customers',
        description: 'Customer profiles, orders and communications.',
      },
      {
        name: 'User Requests',
        pageKey: 'user-requests',
        description: 'Support, feature requests, feedback and complaints.',
      },
      {
        name: 'Help Center',
        pageKey: 'help-center',
        description: 'Knowledge base, guides, FAQs and troubleshooting.',
      },
      {
        name: 'Teams Meet',
        pageKey: 'teams-meet',
        description: 'Team, chat, meetings, tasks and performance.',
      },
    ];

    for (const mod of modules) {
      await queryRunner.query(
        `INSERT INTO "modules" ("name", "page_key", "description") VALUES ($1, $2, $3)`,
        [mod.name, mod.pageKey, mod.description],
      );
    }

    await queryRunner.query(`
      INSERT INTO "role_modules" ("role_id", "module_id")
      SELECT r."id", m."id" FROM "roles" r CROSS JOIN "modules" m
      WHERE r.name IN ('systemadmin', 'superadmin', 'admin')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_modules"`);
    await queryRunner.query(`DELETE FROM "modules"`);
    await queryRunner.query(`DROP TABLE "role_modules"`);
    await queryRunner.query(`DROP TABLE "modules"`);
  }
}
