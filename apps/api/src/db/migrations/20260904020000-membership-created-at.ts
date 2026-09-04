import type { MigrationInterface, QueryRunner } from "typeorm";

export class MembershipCreatedAt20260904020000 implements MigrationInterface {
  name = "MembershipCreatedAt20260904020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE memberships
        ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE memberships
        DROP COLUMN created_at
    `);
  }
}
