import type { MigrationInterface, QueryRunner } from "typeorm";

export class MemberMonthSnapshots20260905030000 implements MigrationInterface {
  name = "MemberMonthSnapshots20260905030000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE member_month_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month text NOT NULL,
        income numeric(14, 2) NOT NULL,
        expense numeric(14, 2) NOT NULL,
        contributed numeric(14, 2) NOT NULL,
        withdrawn numeric(14, 2) NOT NULL,
        carried_in numeric(14, 2) NOT NULL,
        leftover numeric(14, 2) NOT NULL,
        reserve_balance numeric(14, 2) NOT NULL,
        pots jsonb NOT NULL DEFAULT '[]',
        rebuilt_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (space_id, user_id, month)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX member_month_snapshots_space_user_month_idx
      ON member_month_snapshots (space_id, user_id, month)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS member_month_snapshots_space_user_month_idx`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS member_month_snapshots`);
  }
}
