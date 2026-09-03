import type { MigrationInterface, QueryRunner } from "typeorm";

export class SpaceEntryDateMode20260903210000 implements MigrationInterface {
  name = "SpaceEntryDateMode20260903210000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE spaces
      ADD COLUMN entry_date_mode text NOT NULL DEFAULT 'month'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE spaces
      DROP COLUMN entry_date_mode
    `);
  }
}
