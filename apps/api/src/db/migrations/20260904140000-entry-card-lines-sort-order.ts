import type { MigrationInterface, QueryRunner } from "typeorm";

/** Align entry_card_lines with entity after an earlier schema drift. */
export class EntryCardLinesSortOrder20260904140000 implements MigrationInterface {
  name = "EntryCardLinesSortOrder20260904140000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entry_card_lines
        ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE entry_card_lines
        DROP COLUMN IF EXISTS created_at
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entry_card_lines
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE entry_card_lines
        DROP COLUMN IF EXISTS sort_order
    `);
  }
}
