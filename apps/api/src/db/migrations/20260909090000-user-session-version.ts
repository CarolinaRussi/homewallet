import type { MigrationInterface, QueryRunner } from "typeorm";

export class UserSessionVersion20260909090000 implements MigrationInterface {
  name = "UserSessionVersion20260909090000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN session_version integer NOT NULL DEFAULT 1
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS session_version
    `);
  }
}
