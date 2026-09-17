import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDestinationsAndHotelsTables1760000000021 implements MigrationInterface {
  name = 'CreateDestinationsAndHotelsTables1760000000021';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "destinations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" varchar(255) NOT NULL, "slug" varchar(255) NOT NULL, "normalized_name" varchar(255) NOT NULL, "street" varchar(255) NOT NULL DEFAULT '', "city" varchar(255) NOT NULL DEFAULT '', "state" varchar(255) NOT NULL DEFAULT '', "country" varchar(255) NOT NULL DEFAULT '', "country_code" varchar(8) NOT NULL DEFAULT '', "postal_code" varchar(32) NOT NULL DEFAULT '', "latitude" double precision, "longitude" double precision, "display_name" text NOT NULL DEFAULT '', "source" varchar(32), "external_id" varchar(255), "status" varchar(32) NOT NULL DEFAULT 'active', "fingerprint" varchar(512) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_destinations" PRIMARY KEY ("id"), CONSTRAINT "FK_destinations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE, CONSTRAINT "UQ_destinations_fingerprint" UNIQUE ("tenant_id", "fingerprint"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_destinations_tenant_name" ON "destinations" ("tenant_id", "normalized_name")`,
    );
    await queryRunner.query(
      `CREATE TABLE "hotels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "destination_id" uuid NOT NULL, "name" varchar(255) NOT NULL, "normalized_name" varchar(255) NOT NULL, "star_rating" varchar(8) NOT NULL DEFAULT '', "notes" text NOT NULL DEFAULT '', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_hotels" PRIMARY KEY ("id"), CONSTRAINT "FK_hotels_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE, CONSTRAINT "FK_hotels_destination" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT, CONSTRAINT "UQ_hotels_name" UNIQUE ("tenant_id", "destination_id", "normalized_name"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hotels_tenant_name" ON "hotels" ("tenant_id", "normalized_name")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hotels"`);
    await queryRunner.query(`DROP TABLE "destinations"`);
  }
}
