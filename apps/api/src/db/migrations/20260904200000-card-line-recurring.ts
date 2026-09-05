import type { MigrationInterface, QueryRunner } from "typeorm";

export class CardLineRecurring20260904200000 implements MigrationInterface {
  name = "CardLineRecurring20260904200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entry_card_lines
        ADD COLUMN IF NOT EXISTS recurring_group_id uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS entry_card_lines_recurring_group_id_idx
        ON entry_card_lines (recurring_group_id)
      WHERE recurring_group_id IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS entry_card_lines_recurring_group_id_idx
    `);
    await queryRunner.query(`
      ALTER TABLE entry_card_lines
        DROP COLUMN IF EXISTS recurring_group_id
    `);
  }
}
