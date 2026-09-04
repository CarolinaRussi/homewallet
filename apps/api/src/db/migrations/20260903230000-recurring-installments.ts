import type { MigrationInterface, QueryRunner } from "typeorm";

export class RecurringAndInstallments20260903230000 implements MigrationInterface {
  name = "RecurringAndInstallments20260903230000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE recurring_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        type text NOT NULL,
        amount numeric(14, 2) NOT NULL,
        description text NOT NULL DEFAULT '',
        visibility text NOT NULL,
        start_month text NOT NULL,
        end_month text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE installment_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        type text NOT NULL,
        amount numeric(14, 2) NOT NULL,
        installment_count int NOT NULL,
        description text NOT NULL DEFAULT '',
        visibility text NOT NULL,
        start_month text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE recurrence_skips (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recurring_rule_id uuid NOT NULL REFERENCES recurring_rules(id) ON DELETE CASCADE,
        month text NOT NULL,
        UNIQUE (recurring_rule_id, month)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE entries
      ADD COLUMN recurring_rule_id uuid REFERENCES recurring_rules(id) ON DELETE SET NULL,
      ADD COLUMN installment_plan_id uuid REFERENCES installment_plans(id) ON DELETE SET NULL,
      ADD COLUMN installment_number int
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX entries_recurring_rule_month_uidx
      ON entries (recurring_rule_id, occurred_on)
      WHERE recurring_rule_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX entries_installment_plan_number_uidx
      ON entries (installment_plan_id, installment_number)
      WHERE installment_plan_id IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS entries_installment_plan_number_uidx`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS entries_recurring_rule_month_uidx`
    );
    await queryRunner.query(`
      ALTER TABLE entries
      DROP COLUMN IF EXISTS installment_number,
      DROP COLUMN IF EXISTS installment_plan_id,
      DROP COLUMN IF EXISTS recurring_rule_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS recurrence_skips`);
    await queryRunner.query(`DROP TABLE IF EXISTS installment_plans`);
    await queryRunner.query(`DROP TABLE IF EXISTS recurring_rules`);
  }
}
