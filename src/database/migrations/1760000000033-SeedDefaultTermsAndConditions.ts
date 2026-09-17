import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_TERMS } from '../../terms/default-terms';

export class SeedDefaultTermsAndConditions1760000000033 implements MigrationInterface {
  name = 'SeedDefaultTermsAndConditions1760000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenants = (await queryRunner.query(`SELECT "id" FROM "tenants"`)) as {
      id: string;
    }[];

    for (const tenant of tenants) {
      const existing = (await queryRunner.query(
        `SELECT COUNT(*) AS "count" FROM "terms_and_conditions" WHERE "tenant_id" = $1`,
        [tenant.id],
      )) as { count: string }[];
      if (Number(existing[0]?.count ?? 0) > 0) {
        continue;
      }

      for (const [index, term] of DEFAULT_TERMS.entries()) {
        await queryRunner.query(
          `INSERT INTO "terms_and_conditions"
            ("tenant_id", "title", "content", "sort_order", "is_active", "created_by")
           VALUES ($1, $2, $3, $4, true, NULL)`,
          [tenant.id, term.title, term.content, index],
        );
      }
    }

    await queryRunner.query(
      `UPDATE "confirmation_vouchers" AS voucher
       SET "terms_snapshot" = COALESCE((
         SELECT jsonb_agg(
           jsonb_build_object(
             'id', term."id",
             'title', term."title",
             'content', term."content",
             'sortOrder', term."sort_order"
           )
           ORDER BY term."sort_order", term."created_at"
         )
         FROM "terms_and_conditions" AS term
         WHERE term."tenant_id" = voucher."tenant_id"
           AND term."is_active" = true
       ), '[]'::jsonb)
       WHERE voucher."terms_snapshot" = '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "terms_and_conditions"
       WHERE "created_by" IS NULL AND "content" = ANY($1)`,
      [DEFAULT_TERMS.map((term) => term.content)],
    );
  }
}
