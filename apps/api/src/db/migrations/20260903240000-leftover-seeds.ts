import type { MigrationInterface, QueryRunner } from "typeorm";

export class LeftoverSeeds20260903240000 implements MigrationInterface {
  name = "LeftoverSeeds20260903240000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE leftover_seeds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount numeric(14, 2) NOT NULL,
        description text NOT NULL DEFAULT '',
        occurred_on date NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_leftover_seeds_space_user_date
      ON leftover_seeds (space_id, user_id, occurred_on)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE leftover_seeds`);
  }
}
