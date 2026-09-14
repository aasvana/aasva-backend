import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedSuperadminUsers1760000000003 implements MigrationInterface {
  name = 'SeedSuperadminUsers1760000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "is_superadmin" boolean NOT NULL DEFAULT false
    `);

    const superadmins = [
      {
        email: 'techaquib@gmail.com',
        password: 'Shadow@007',
        firstName: 'Tech',
        lastName: 'Aquib',
      },
      {
        email: 'developer@aasvana.com',
        password: 'NoPassw0rd4U',
        firstName: 'Dev',
        lastName: 'Super',
      },
    ];

    for (const sa of superadmins) {
      const passwordHash = await bcrypt.hash(sa.password, 12);
      await queryRunner.query(
        `INSERT INTO "users" ("email", "first_name", "last_name", "password_hash", "is_active", "is_email_verified", "is_superadmin")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sa.email.toLowerCase(),
          sa.firstName,
          sa.lastName,
          passwordHash,
          true,
          true,
          true,
        ],
      );

      await queryRunner.query(
        `INSERT INTO "user_roles" ("user_id", "role_id")
         SELECT u."id", r."id" FROM "users" u CROSS JOIN "roles" r
         WHERE u."email" = $1 AND r."name" IN ('systemadmin', 'superadmin', 'admin', 'user')`,
        [sa.email.toLowerCase()],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "users" WHERE "email" IN ('techaquib@gmail.com', 'developer@aasvana.com')`,
    );

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "is_superadmin"
    `);
  }
}
