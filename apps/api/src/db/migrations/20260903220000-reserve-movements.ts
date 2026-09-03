import type { MigrationInterface, QueryRunner } from "typeorm";

export class ReserveMovements20260903220000 implements MigrationInterface {
  name = "ReserveMovements20260903220000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE reserve_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type text NOT NULL,
        amount numeric(14, 2) NOT NULL,
        description text NOT NULL DEFAULT '',
        occurred_on date NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_reserve_movements_space_user_date
      ON reserve_movements (space_id, user_id, occurred_on)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE reserve_movements`);
  }
}
