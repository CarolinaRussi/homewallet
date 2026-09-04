import type { MigrationInterface, QueryRunner } from "typeorm";

export class CardLineInstallments20260904160000 implements MigrationInterface {
  name = "CardLineInstallments20260904160000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entries
        ADD COLUMN IF NOT EXISTS card_installment_seeded boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE entry_card_lines
        ADD COLUMN IF NOT EXISTS installment_group_id uuid NULL,
        ADD COLUMN IF NOT EXISTS installment_number int NULL,
        ADD COLUMN IF NOT EXISTS installment_count int NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS entry_card_lines_installment_group_id_idx
        ON entry_card_lines (installment_group_id)
      WHERE installment_group_id IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS entry_card_lines_installment_group_id_idx
    `);
    await queryRunner.query(`
      ALTER TABLE entry_card_lines
        DROP COLUMN IF EXISTS installment_group_id,
        DROP COLUMN IF EXISTS installment_number,
        DROP COLUMN IF EXISTS installment_count
    `);
    await queryRunner.query(`
      ALTER TABLE entries
        DROP COLUMN IF EXISTS card_installment_seeded
    `);
  }
}
