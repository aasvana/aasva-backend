import { randomBytes } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';

type CustomerSplit = {
  email: string;
  tenantName: string;
};

const CUSTOMER_SPLITS: CustomerSplit[] = [
  { email: 'info@andamantripmaker.in', tenantName: 'Andaman Trip Maker' },
];

const PLATFORM_ADMIN_EMAILS = [
  'techaquib@gmail.com',
  'developer@aasvana.com',
] as const;

const RESET_PLATFORM_BRANDING = true;

const PLATFORM_BRANDING = {
  name: 'Aasvana',
  shortName: 'Xm',
  email: 'admin@aasvana.com',
  phone: '+91 90000 00000',
  address: 'Aasvana HQ',
  website: 'https://www.aasvana.com',
  tagline:
    'Aasvana is a powerful and flexible web application template designed for building modern, responsive, and user-friendly applications.',
  logo: '/imgs/brand/Aasvana_Logo.png',
  currency: 'USD',
  gstin: '',
  pan: '',
  tan: '',
  cin: '',
  defaultTaxRate: 0,
  businessType: 'Private Limited',
  incorporationDate: '',
  authorizedSignatory: 'Aquib Shahbaz',
};

const PLACEHOLDER = 'FILL_IN_';

const VOUCHER_NUMBER = `NULLIF(regexp_replace(v."voucher_no", '^.*?([0-9]+)([^0-9]*)$', '\\1'), '')::integer`;

const COMPANY_SETTING_COLUMNS = [
  'name',
  'short_name',
  'email',
  'phone',
  'address',
  'website',
  'tagline',
  'logo',
  'currency',
  'gstin',
  'pan',
  'tan',
  'cin',
  'default_tax_rate',
  'business_type',
  'incorporation_date',
  'authorized_signatory',
  'created_at',
  'updated_at',
] as const;

const TRAVEL_SETTING_COLUMNS = [
  'voucher_prefix',
  'voucher_suffix',
  'invoice_prefix',
  'invoice_suffix',
  'default_currency',
  'default_payment_type',
  'default_tax_rate',
  'general_details',
  'created_at',
  'updated_at',
] as const;

const TENANT_SCOPED_TABLES = [
  'confirmation_vouchers',
  'packages',
  'terms_and_conditions',
  'itinerary_templates',
] as const;

function buildSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'tenant';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

function assertMappingIsComplete(): void {
  if (CUSTOMER_SPLITS.length === 0) {
    throw new Error(
      'SplitCollapsedTenant: CUSTOMER_SPLITS is empty. Nothing to do.',
    );
  }
  for (const split of CUSTOMER_SPLITS) {
    if (
      split.email.includes(PLACEHOLDER) ||
      split.tenantName.includes(PLACEHOLDER) ||
      !split.email.includes('@') ||
      split.tenantName.trim().length === 0
    ) {
      throw new Error(
        `SplitCollapsedTenant: CUSTOMER_SPLITS is not filled in (${split.email} / ${split.tenantName}). ` +
          'Set the real customer email and company name before running this migration.',
      );
    }
  }
}

async function tableExists(
  queryRunner: QueryRunner,
  table: string,
): Promise<boolean> {
  const rows = (await queryRunner.query(`SELECT to_regclass($1) AS reg`, [
    `public.${table}`,
  ])) as { reg: string | null }[];
  return Boolean(rows[0]?.reg);
}

export class SplitCollapsedTenant1760000000039 implements MigrationInterface {
  name = 'SplitCollapsedTenant1760000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    assertMappingIsComplete();

    await this.repairBrokenDefaultLogo(queryRunner);

    let splitAny = false;
    for (const split of CUSTOMER_SPLITS) {
      splitAny = (await this.splitCustomer(queryRunner, split)) || splitAny;
    }

    if (splitAny && RESET_PLATFORM_BRANDING) {
      await this.resetPlatformBranding(queryRunner);
    }

    await this.assertPlatformAdminsIntact(queryRunner);
  }

  private async repairBrokenDefaultLogo(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const broken = '/images/logo-light.svg';
    const replacement = '/imgs/brand/Aasvana_Logo.png';

    const affected = (await queryRunner.query(
      `UPDATE "company_settings"
          SET "logo" = $1, "updated_at" = now()
        WHERE "logo" = $2
        RETURNING "id"`,
      [replacement, broken],
    )) as unknown[];

    if (affected.length > 0) {
      console.log(
        `[migration] Repaired ${affected.length} company_settings row(s) still pointing at the missing ${broken}.`,
      );
    }
  }

  private async assertPlatformAdminsIntact(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const admins = (await queryRunner.query(
      `SELECT u."email", u."tenant_id",
              COALESCE(array_agg(r."name") FILTER (WHERE r."name" IS NOT NULL), '{}') AS "roles"
         FROM "users" u
         LEFT JOIN "user_roles" ur ON ur."user_id" = u."id"
         LEFT JOIN "roles" r ON r."id" = ur."role_id"
        WHERE lower(u."email") = ANY($1::text[])
        GROUP BY u."email", u."tenant_id"`,
      [[...PLATFORM_ADMIN_EMAILS]],
    )) as { email: string; tenant_id: string; roles: string[] }[];

    for (const email of PLATFORM_ADMIN_EMAILS) {
      const admin = admins.find(
        (a) => a.email.toLowerCase() === email.toLowerCase(),
      );
      if (!admin) {
        throw new Error(
          `SplitCollapsedTenant: platform admin "${email}" was not found. This migration must not run without the platform admins present.`,
        );
      }
      if (admin.tenant_id !== DEFAULT_TENANT_ID) {
        throw new Error(
          `SplitCollapsedTenant: platform admin "${email}" is no longer on the default tenant (found ${admin.tenant_id}). This migration is meant to leave them in place; resolve manually.`,
        );
      }
      const isPlatform = admin.roles.some(
        (r) => r === 'systemadmin' || r === 'superadmin',
      );
      if (!isPlatform) {
        throw new Error(
          `SplitCollapsedTenant: platform admin "${email}" has lost the systemadmin/superadmin role (found: ${admin.roles.join(', ') || 'none'}). Restore the role before continuing.`,
        );
      }
    }

    console.log(
      `[migration] Platform admins verified intact on the default tenant: ${PLATFORM_ADMIN_EMAILS.join(', ')}.`,
    );
  }

  private async splitCustomer(
    queryRunner: QueryRunner,
    split: CustomerSplit,
  ): Promise<boolean> {
    const users = (await queryRunner.query(
      `SELECT u."id", u."tenant_id",
              COALESCE(array_agg(r."name") FILTER (WHERE r."name" IS NOT NULL), '{}') AS "roles"
         FROM "users" u
         LEFT JOIN "user_roles" ur ON ur."user_id" = u."id"
         LEFT JOIN "roles" r ON r."id" = ur."role_id"
        WHERE lower(u."email") = lower($1)
        GROUP BY u."id", u."tenant_id"`,
      [split.email],
    )) as { id: string; tenant_id: string; roles: string[] }[];

    if (users.length === 0) {
      throw new Error(
        `SplitCollapsedTenant: no user found for email "${split.email}". Fix the mapping or do not run this migration.`,
      );
    }
    if (users.length > 1) {
      throw new Error(
        `SplitCollapsedTenant: ${users.length} users share the email "${split.email}". Resolve that first.`,
      );
    }

    const user = users[0];
    const isPlatformAdmin = user.roles.some(
      (r) => r === 'systemadmin' || r === 'superadmin',
    );
    if (isPlatformAdmin) {
      throw new Error(
        `SplitCollapsedTenant: refusing to move "${split.email}" because it holds the systemadmin/superadmin role. Platform admins stay on the default tenant.`,
      );
    }
    if (user.tenant_id !== DEFAULT_TENANT_ID) {
      console.log(
        `[migration] ${split.email} is already on tenant ${user.tenant_id}; skipping.`,
      );
      return false;
    }

    const tenantId = randomBytes(16).toString('hex');
    const formattedTenantId = `${tenantId.slice(0, 8)}-${tenantId.slice(8, 12)}-${tenantId.slice(12, 16)}-${tenantId.slice(16, 20)}-${tenantId.slice(20)}`;

    await queryRunner.query(
      `INSERT INTO "tenants" ("id", "name", "slug", "subscription_status", "subscription_plan", "subscription_paid_until")
       VALUES ($1, $2, $3, 'active', 'lifetime', NULL)`,
      [formattedTenantId, split.tenantName, buildSlug(split.tenantName)],
    );

    const collision = (await queryRunner.query(
      `SELECT count(*)::int AS count
         FROM "confirmation_vouchers"
        WHERE "tenant_id" = $1
          AND "voucher_no" IN (SELECT "voucher_no" FROM "confirmation_vouchers" WHERE "tenant_id" = $2)`,
      [formattedTenantId, DEFAULT_TENANT_ID],
    )) as { count: number }[];
    if ((collision[0]?.count ?? 0) > 0) {
      throw new Error(
        `SplitCollapsedTenant: voucher_no collision moving records to ${split.tenantName}. Aborted.`,
      );
    }

    await queryRunner.query(
      `INSERT INTO "company_settings" ("tenant_id", ${COMPANY_SETTING_COLUMNS.map(
        (c) => `"${c}"`,
      ).join(', ')})
       SELECT $1, ${COMPANY_SETTING_COLUMNS.map((c) => `"${c}"`).join(', ')}
         FROM "company_settings"
        WHERE "tenant_id" = $2`,
      [formattedTenantId, DEFAULT_TENANT_ID],
    );

    const existingTravelSettings = (await queryRunner.query(
      `SELECT count(*)::int AS count FROM "travel_settings" WHERE "tenant_id" = $1`,
      [DEFAULT_TENANT_ID],
    )) as { count: number }[];

    if ((existingTravelSettings[0]?.count ?? 0) > 0) {
      await queryRunner.query(
        `INSERT INTO "travel_settings" ("tenant_id", ${TRAVEL_SETTING_COLUMNS.map(
          (c) => `"${c}"`,
        ).join(', ')})
         SELECT $1, ${TRAVEL_SETTING_COLUMNS.map((c) => `"${c}"`).join(', ')}
           FROM "travel_settings"
          WHERE "tenant_id" = $2`,
        [formattedTenantId, DEFAULT_TENANT_ID],
      );
    } else {
      await queryRunner.query(
        `INSERT INTO "travel_settings" ("tenant_id") VALUES ($1)`,
        [formattedTenantId],
      );
    }

    for (const table of TENANT_SCOPED_TABLES) {
      if (!(await tableExists(queryRunner, table))) continue;
      await queryRunner.query(
        `UPDATE "${table}" SET "tenant_id" = $1 WHERE "tenant_id" = $2`,
        [formattedTenantId, DEFAULT_TENANT_ID],
      );
    }

    await queryRunner.query(
      `INSERT INTO "travel_voucher_sequences" ("tenant_id", "current_value")
       SELECT $1, COALESCE(MAX(${VOUCHER_NUMBER}), 0)
         FROM "confirmation_vouchers" v
        WHERE v."tenant_id" = $1
       ON CONFLICT ("tenant_id") DO UPDATE
         SET "current_value" = EXCLUDED."current_value"`,
      [formattedTenantId],
    );

    await queryRunner.query(
      `UPDATE "travel_voucher_sequences" s
          SET "current_value" = COALESCE(matches."max_value", 0)
         FROM (
           SELECT MAX(${VOUCHER_NUMBER}) AS "max_value"
             FROM "confirmation_vouchers" v
            WHERE v."tenant_id" = s."tenant_id"
         ) matches
        WHERE s."tenant_id" = $1`,
      [DEFAULT_TENANT_ID],
    );

    await queryRunner.query(
      `UPDATE "users" SET "tenant_id" = $1 WHERE "id" = $2`,
      [formattedTenantId, user.id],
    );

    console.log(
      `[migration] Moved ${split.email} to new tenant "${split.tenantName}" (${formattedTenantId}).`,
    );

    return true;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    assertMappingIsComplete();

    for (const split of CUSTOMER_SPLITS) {
      const users = (await queryRunner.query(
        `SELECT u."id", u."tenant_id" FROM "users" u WHERE lower(u."email") = lower($1)`,
        [split.email],
      )) as { id: string; tenant_id: string }[];
      if (users.length === 0 || users[0].tenant_id === DEFAULT_TENANT_ID) {
        continue;
      }

      const tenantId = users[0].tenant_id;

      for (const table of TENANT_SCOPED_TABLES) {
        if (!(await tableExists(queryRunner, table))) continue;
        await queryRunner.query(
          `UPDATE "${table}" SET "tenant_id" = $1 WHERE "tenant_id" = $2`,
          [DEFAULT_TENANT_ID, tenantId],
        );
      }

      await queryRunner.query(
        `UPDATE "users" SET "tenant_id" = $1 WHERE "id" = $2`,
        [DEFAULT_TENANT_ID, users[0].id],
      );

      await queryRunner.query(`DELETE FROM "tenants" WHERE "id" = $1`, [
        tenantId,
      ]);
    }
  }

  public async resetPlatformBranding(queryRunner: QueryRunner): Promise<void> {
    if (!RESET_PLATFORM_BRANDING) return;

    const affected = (await queryRunner.query(
      `UPDATE "company_settings"
          SET "name" = $2, "short_name" = $3, "email" = $4, "phone" = $5,
              "address" = $6, "website" = $7, "tagline" = $8, "logo" = $9,
              "currency" = $10, "gstin" = $11, "pan" = $12, "tan" = $13,
              "cin" = $14, "default_tax_rate" = $15, "business_type" = $16,
              "incorporation_date" = $17, "authorized_signatory" = $18,
              "updated_at" = now()
        WHERE "tenant_id" = $1
        RETURNING "id"`,
      [
        DEFAULT_TENANT_ID,
        PLATFORM_BRANDING.name,
        PLATFORM_BRANDING.shortName,
        PLATFORM_BRANDING.email,
        PLATFORM_BRANDING.phone,
        PLATFORM_BRANDING.address,
        PLATFORM_BRANDING.website,
        PLATFORM_BRANDING.tagline,
        PLATFORM_BRANDING.logo,
        PLATFORM_BRANDING.currency,
        PLATFORM_BRANDING.gstin,
        PLATFORM_BRANDING.pan,
        PLATFORM_BRANDING.tan,
        PLATFORM_BRANDING.cin,
        PLATFORM_BRANDING.defaultTaxRate,
        PLATFORM_BRANDING.businessType,
        PLATFORM_BRANDING.incorporationDate,
        PLATFORM_BRANDING.authorizedSignatory,
      ],
    )) as { id: string }[];

    console.log(
      `[migration] Reset platform tenant branding (${affected.length ?? 0} row(s)).`,
    );
  }
}
