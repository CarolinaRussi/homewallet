import type { MigrationInterface, QueryRunner } from "typeorm";

export class EntryTransfers20260904120000 implements MigrationInterface {
  name = "EntryTransfers20260904120000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entries
        ALTER COLUMN category_id DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE entries
        ADD COLUMN transfer_group_id uuid NULL,
        ADD COLUMN counterparty_user_id uuid NULL
          REFERENCES users(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX entries_transfer_group_id_idx
        ON entries (transfer_group_id)
      WHERE transfer_group_id IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS entries_transfer_group_id_idx
    `);
    await queryRunner.query(`
      ALTER TABLE entries
        DROP COLUMN IF EXISTS transfer_group_id,
        DROP COLUMN IF EXISTS counterparty_user_id
    `);
    await queryRunner.query(`
      ALTER TABLE entries
        ALTER COLUMN category_id SET NOT NULL
    `);
  }
}
