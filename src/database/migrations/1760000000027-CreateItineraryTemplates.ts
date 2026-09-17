import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateItineraryTemplates1760000000027 implements MigrationInterface {
  name = 'CreateItineraryTemplates1760000000027';
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE "itinerary_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "subject" varchar(255) NOT NULL, "normalized_subject" varchar(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_itinerary_templates" PRIMARY KEY ("id"), CONSTRAINT "FK_itinerary_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE)`,
    );
    await q.query(
      `CREATE INDEX "IDX_itinerary_templates_tenant_subject" ON "itinerary_templates" ("tenant_id", "normalized_subject")`,
    );
    await q.query(
      `CREATE TABLE "itinerary_template_days" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "template_id" uuid NOT NULL, "day_order" integer NOT NULL, "subject" varchar(255) NOT NULL, "description" text NOT NULL, CONSTRAINT "PK_itinerary_template_days" PRIMARY KEY ("id"), CONSTRAINT "FK_itinerary_template_days_template" FOREIGN KEY ("template_id") REFERENCES "itinerary_templates"("id") ON DELETE CASCADE)`,
    );
    await q.query(
      `CREATE INDEX "IDX_itinerary_template_days_order" ON "itinerary_template_days" ("template_id", "day_order")`,
    );
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TABLE "itinerary_template_days"`);
    await q.query(`DROP TABLE "itinerary_templates"`);
  }
}
