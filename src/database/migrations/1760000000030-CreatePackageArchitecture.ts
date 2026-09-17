import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreatePackageArchitecture1760000000030 implements MigrationInterface {
  name = 'CreatePackageArchitecture1760000000030';
  async up(q: QueryRunner) {
    // 1. Rename tables
    await q.query(`ALTER TABLE "itinerary_templates" RENAME TO "packages"`);
    await q.query(
      `ALTER TABLE "itinerary_template_days" RENAME TO "package_days"`,
    );
    // 2. Rename columns in packages
    await q.query(`ALTER TABLE "packages" RENAME COLUMN "subject" TO "name"`);
    await q.query(
      `ALTER TABLE "packages" RENAME COLUMN "normalized_subject" TO "normalized_name"`,
    );
    await q.query(
      `ALTER TABLE "packages" RENAME COLUMN "price" TO "base_price"`,
    );
    // 3. Rename columns in package_days
    await q.query(
      `ALTER TABLE "package_days" RENAME COLUMN "template_id" TO "package_id"`,
    );
    // 4. Rename constraints/indexes
    await q.query(
      `ALTER TABLE "packages" RENAME CONSTRAINT "PK_itinerary_templates" TO "PK_packages"`,
    );
    await q.query(
      `ALTER TABLE "packages" RENAME CONSTRAINT "FK_itinerary_templates_tenant" TO "FK_packages_tenant"`,
    );
    await q.query(
      `ALTER INDEX "IDX_itinerary_templates_tenant_subject" RENAME TO "IDX_packages_tenant_name"`,
    );
    await q.query(
      `ALTER TABLE "package_days" RENAME CONSTRAINT "PK_itinerary_template_days" TO "PK_package_days"`,
    );
    await q.query(
      `ALTER TABLE "package_days" RENAME CONSTRAINT "FK_itinerary_template_days_template" TO "FK_package_days_package"`,
    );
    await q.query(
      `ALTER INDEX "IDX_itinerary_template_days_order" RENAME TO "IDX_package_days_package_order"`,
    );
    // 5. Add new columns to packages
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "slug" varchar(255) NOT NULL DEFAULT ''`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "short_description" text NOT NULL DEFAULT ''`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "description" text NOT NULL DEFAULT ''`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "destination_id" uuid NULL`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "duration_days" integer NOT NULL DEFAULT 1`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "duration_nights" integer NOT NULL DEFAULT 0`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "pricing_type" varchar(20) NOT NULL DEFAULT 'PER_PERSON'`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "is_public" boolean NOT NULL DEFAULT false`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD COLUMN "is_featured" boolean NOT NULL DEFAULT false`,
    );
    await q.query(`ALTER TABLE "packages" ADD COLUMN "created_by" uuid NULL`);
    // 6. Add FKs
    await q.query(
      `ALTER TABLE "packages" ADD CONSTRAINT "FK_packages_destination" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL`,
    );
    await q.query(
      `ALTER TABLE "packages" ADD CONSTRAINT "FK_packages_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    // 7. Create unique index for slug (tenant-scoped)
    await q.query(
      `CREATE UNIQUE INDEX "IDX_packages_tenant_slug" ON "packages" ("tenant_id", "slug")`,
    );
    // 8. Backfill slug from name (unique per tenant)
    await q.query(`
      UPDATE "packages" p SET "slug" = lower(regexp_replace(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
    `);
    await q.query(`
      WITH numbered AS (
        SELECT "id", "tenant_id", "slug",
          row_number() OVER (PARTITION BY "tenant_id", "slug" ORDER BY "created_at") AS rn
        FROM "packages"
      )
      UPDATE "packages" p SET "slug" = n."slug" || '-' || left(n."id"::text, 8)
      FROM "numbered" n WHERE p."id" = n."id" AND n.rn > 1
    `);
    // 9. Backfill duration_days from day count
    await q.query(`
      UPDATE "packages" p SET "duration_days" = GREATEST(1, COALESCE(
        (SELECT COUNT(*)::int FROM "package_days" d WHERE d."package_id" = p."id"), 1
      ))
    `);
    // 10. Add created_at/updated_at to package_days
    await q.query(
      `ALTER TABLE "package_days" ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await q.query(
      `ALTER TABLE "package_days" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    // 11. Create package_images
    await q.query(`
      CREATE TABLE "package_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" uuid NOT NULL,
        "image_url" text NOT NULL,
        "alt_text" varchar(255) NOT NULL DEFAULT '',
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_cover" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_package_images" PRIMARY KEY ("id"),
        CONSTRAINT "FK_package_images_package" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE
      )
    `);
    await q.query(
      `CREATE INDEX "IDX_package_images_package_order" ON "package_images" ("package_id", "sort_order")`,
    );
    // 12. Create package_inclusions
    await q.query(`
      CREATE TABLE "package_inclusions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_package_inclusions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_package_inclusions_package" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE
      )
    `);
    await q.query(
      `CREATE INDEX "IDX_package_inclusions_package_order" ON "package_inclusions" ("package_id", "sort_order")`,
    );
    // 13. Create package_exclusions
    await q.query(`
      CREATE TABLE "package_exclusions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_package_exclusions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_package_exclusions_package" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE
      )
    `);
    await q.query(
      `CREATE INDEX "IDX_package_exclusions_package_order" ON "package_exclusions" ("package_id", "sort_order")`,
    );
    // 14. Add package_id to confirmation_vouchers
    await q.query(
      `ALTER TABLE "confirmation_vouchers" ADD COLUMN "package_id" uuid NULL`,
    );
    await q.query(
      `ALTER TABLE "confirmation_vouchers" ADD CONSTRAINT "FK_confirmation_vouchers_package" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL`,
    );
    await q.query(
      `CREATE INDEX "IDX_confirmation_vouchers_package_id" ON "confirmation_vouchers" ("package_id")`,
    );
  }
  async down(q: QueryRunner) {
    // Remove package_id from confirmation_vouchers
    await q.query(`DROP INDEX "IDX_confirmation_vouchers_package_id"`);
    await q.query(
      `ALTER TABLE "confirmation_vouchers" DROP CONSTRAINT "FK_confirmation_vouchers_package"`,
    );
    await q.query(
      `ALTER TABLE "confirmation_vouchers" DROP COLUMN "package_id"`,
    );
    // Drop new tables
    await q.query(`DROP TABLE "package_exclusions"`);
    await q.query(`DROP TABLE "package_inclusions"`);
    await q.query(`DROP TABLE "package_images"`);
    // Drop new columns from package_days
    await q.query(`ALTER TABLE "package_days" DROP COLUMN "updated_at"`);
    await q.query(`ALTER TABLE "package_days" DROP COLUMN "created_at"`);
    // Drop new columns from packages
    await q.query(
      `ALTER TABLE "packages" DROP CONSTRAINT "FK_packages_created_by"`,
    );
    await q.query(
      `ALTER TABLE "packages" DROP CONSTRAINT "FK_packages_destination"`,
    );
    await q.query(`ALTER TABLE "packages" DROP COLUMN "created_by"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "is_featured"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "is_public"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "pricing_type"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "duration_nights"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "duration_days"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "destination_id"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "description"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "short_description"`);
    await q.query(`DROP INDEX "IDX_packages_tenant_slug"`);
    await q.query(`ALTER TABLE "packages" DROP COLUMN "slug"`);
    // Rename back
    await q.query(
      `ALTER INDEX "IDX_packages_tenant_name" RENAME TO "IDX_itinerary_templates_tenant_subject"`,
    );
    await q.query(
      `ALTER TABLE "packages" RENAME CONSTRAINT "FK_packages_tenant" TO "FK_itinerary_templates_tenant"`,
    );
    await q.query(
      `ALTER TABLE "packages" RENAME CONSTRAINT "PK_packages" TO "PK_itinerary_templates"`,
    );
    await q.query(
      `ALTER INDEX "IDX_package_days_package_order" RENAME TO "IDX_itinerary_template_days_order"`,
    );
    await q.query(
      `ALTER TABLE "package_days" RENAME CONSTRAINT "FK_package_days_package" TO "FK_itinerary_template_days_template"`,
    );
    await q.query(
      `ALTER TABLE "package_days" RENAME CONSTRAINT "PK_package_days" TO "PK_itinerary_template_days"`,
    );
    await q.query(
      `ALTER TABLE "package_days" RENAME COLUMN "package_id" TO "template_id"`,
    );
    await q.query(
      `ALTER TABLE "packages" RENAME COLUMN "base_price" TO "price"`,
    );
    await q.query(
      `ALTER TABLE "packages" RENAME COLUMN "normalized_name" TO "normalized_subject"`,
    );
    await q.query(`ALTER TABLE "packages" RENAME COLUMN "name" TO "subject"`);
    await q.query(`ALTER TABLE "packages" RENAME TO "itinerary_templates"`);
    await q.query(
      `ALTER TABLE "package_days" RENAME TO "itinerary_template_days"`,
    );
  }
}
