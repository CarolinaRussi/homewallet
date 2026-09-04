import type { MigrationInterface, QueryRunner } from "typeorm";

export class EntryCardLines20260904130000 implements MigrationInterface {
  name = "EntryCardLines20260904130000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE entry_card_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        description text NOT NULL,
        amount numeric(14, 2) NOT NULL,
        sort_order int NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE INDEX entry_card_lines_entry_id_idx
        ON entry_card_lines (entry_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS entry_card_lines_entry_id_idx
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS entry_card_lines
    `);
  }
}
