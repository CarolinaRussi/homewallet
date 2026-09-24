import type { MigrationInterface, QueryRunner } from "typeorm";

export class MembershipBudgetLayers20260924120000 implements MigrationInterface {
  name = "MembershipBudgetLayers20260924120000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE memberships
        ADD COLUMN budget_layers_enabled boolean NOT NULL DEFAULT false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE memberships DROP COLUMN budget_layers_enabled
    `);
  }
}
