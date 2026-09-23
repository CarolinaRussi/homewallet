import type { MigrationInterface, QueryRunner } from "typeorm";

export class SpaceHistoryMoves20260923180000 implements MigrationInterface {
  name = "SpaceHistoryMoves20260923180000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE space_history_moves (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
        target_space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        direction text NOT NULL,
        entry_count int NOT NULL DEFAULT 0,
        moved_at timestamptz NOT NULL DEFAULT now(),
        preview_hash text
      )
    `);
    await queryRunner.query(`
      CREATE INDEX space_history_moves_user_target_idx
        ON space_history_moves (user_id, target_space_id, direction)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS space_history_moves`);
  }
}
