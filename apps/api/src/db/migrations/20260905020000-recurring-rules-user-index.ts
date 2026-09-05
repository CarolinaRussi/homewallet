import type { MigrationInterface, QueryRunner } from "typeorm";

export class RecurringRulesUserIndex20260905020000 implements MigrationInterface {
  name = "RecurringRulesUserIndex20260905020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX recurring_rules_space_user_idx
      ON recurring_rules (space_id, user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX installment_plans_space_user_idx
      ON installment_plans (space_id, user_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS installment_plans_space_user_idx`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS recurring_rules_space_user_idx`
    );
  }
}
