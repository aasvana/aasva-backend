import { MigrationInterface, QueryRunner } from 'typeorm';

const MODULE_SUB_MODULES: Record<string, string[]> = {
  Dashboard: ['Overview'],
  Accounting: [
    'Dashboard',
    'Sales',
    'Invoices',
    'Purchases',
    'Expenses',
    'Banking & Cash',
    'Accounting',
    'Taxes',
    'Reports',
    'Settings',
  ],
  Auditing: [
    'Overview',
    'Activity Log',
    'Audit Trail',
    'User Activity',
    'Login & Security',
    'Data Changes',
    'Financial Audit',
    'Inventory Audit',
    'Approval History',
    'Export & Reports',
  ],
  Travel: [
    'Dashboard',
    'Customers',
    'Agents',
    'Enquiries',
    'Itineraries',
    'Bookings',
    'Confirmation Vouchers',
    'Suppliers',
    'Travel Documents',
    'Settings',
  ],
  Delivery: [
    'Overview',
    'Deliveries',
    'Dispatch',
    'Delivery Partners',
    'Delivery Zones',
    'Delivery Charges',
    'Settings',
  ],
  Healthcare: [
    'Overview',
    'Patients',
    'Appointments',
    'Queue',
    'Consultations',
    'Medical Records',
    'Prescriptions',
    'Investigations',
    'Treatments',
    'Follow-ups',
    'Billing',
    'Pharmacy',
    'Staff',
    'Reports',
    'Settings',
  ],
  Store: [
    'Overview',
    'Register',
    'Outlets',
    'Products',
    'Sales',
    'Inventory',
    'Stock Transfers',
    'Settings',
  ],
  Analytics: [
    'Overview',
    'Sales',
    'Customers',
    'Products',
    'Inventory',
    'Accounting',
    'Expenses',
    'Travel',
    'Delivery',
    'Team',
  ],
  Customers: [
    'Overview',
    'Details',
    'Travel',
    'Sales',
    'Communication',
    'Notes',
    'Activity',
  ],
  'User Requests': [
    'Overview',
    'All Requests',
    'Support',
    'Feature Requests',
    'Feedback',
    'Bug Reports',
    'Complaints',
    'Announcements',
  ],
  'Help Center': [
    'Overview',
    'Knowledge Base',
    'FAQs',
    'Guides',
    'Troubleshooting',
    "What's New",
  ],
  'Teams Meet': [
    'Overview',
    'Team',
    'Chat',
    'Meetings',
    'Work',
    'Onboarding',
    'Time & Attendance',
    'Performance',
    'Documents',
    'Announcements',
  ],
};

const SUBSCRIPTION_PLANS = [
  { key: 'monthly', name: 'Monthly', durationDays: 30, price: '49.00' },
  {
    key: 'biannually',
    name: 'Bi-annually',
    durationDays: 182,
    price: '249.00',
  },
  { key: 'annually', name: 'Annually', durationDays: 365, price: '449.00' },
  { key: 'trial', name: 'Trial', durationDays: 90, price: null },
  { key: 'lifetime', name: 'Lifetime', durationDays: null, price: '9999.00' },
];

export class AddSubscriptionPlansAndSubModules1760000000019 implements MigrationInterface {
  name = 'AddSubscriptionPlansAndSubModules1760000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "duration_days" integer,
        "price" numeric(12, 2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_plans_key" UNIQUE ("key")
      )
    `);

    for (const plan of SUBSCRIPTION_PLANS) {
      await queryRunner.query(
        `INSERT INTO "subscription_plans" ("key", "name", "duration_days", "price")
         VALUES ($1, $2, $3, $4)`,
        [plan.key, plan.name, plan.durationDays, plan.price],
      );
    }

    await queryRunner.query(`
      ALTER TABLE "modules"
        ADD "sub_modules" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    for (const [name, subModules] of Object.entries(MODULE_SUB_MODULES)) {
      await queryRunner.query(
        `UPDATE "modules" SET "sub_modules" = $1::jsonb WHERE "name" = $2`,
        [JSON.stringify(subModules), name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "sub_modules"`);
    await queryRunner.query(`DROP TABLE "subscription_plans"`);
  }
}
