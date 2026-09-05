import type { MigrationInterface, QueryRunner } from "typeorm";

export class CardLineRecurringSkips20260905010000 implements MigrationInterface {
  name = "CardLineRecurringSkips20260905010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS entry_card_recurring_skips (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        recurring_group_id uuid NOT NULL,
        month text NOT NULL,
        UNIQUE (recurring_group_id, month)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS entry_card_recurring_skips_group_idx
        ON entry_card_recurring_skips (recurring_group_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS entry_card_recurring_skips_group_idx
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS entry_card_recurring_skips
    `);
  }
}
