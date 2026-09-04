import type { MigrationInterface, QueryRunner } from "typeorm";

export class LimitsAndBudgetLayers20260903250000 implements MigrationInterface {
  name = "LimitsAndBudgetLayers20260903250000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE spaces
        ADD COLUMN space_limit_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN space_limit_amount numeric(14, 2) NULL,
        ADD COLUMN budget_layers_enabled boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE memberships
        ADD COLUMN personal_limit_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN personal_limit_amount numeric(14, 2) NULL,
        ADD COLUMN leftover_target_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN leftover_target_amount numeric(14, 2) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE categories
        ADD COLUMN budget_layer text NULL
    `);
    await queryRunner.query(`
      UPDATE categories SET budget_layer = 'essential'
      WHERE name IN ('Moradia', 'Alimentação', 'Transporte', 'Saúde')
    `);
    await queryRunner.query(`
      UPDATE categories SET budget_layer = 'personal'
      WHERE name IN ('Lazer', 'Assinaturas')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories DROP COLUMN budget_layer
    `);
    await queryRunner.query(`
      ALTER TABLE memberships
        DROP COLUMN personal_limit_enabled,
        DROP COLUMN personal_limit_amount,
        DROP COLUMN leftover_target_enabled,
        DROP COLUMN leftover_target_amount
    `);
    await queryRunner.query(`
      ALTER TABLE spaces
        DROP COLUMN space_limit_enabled,
        DROP COLUMN space_limit_amount,
        DROP COLUMN budget_layers_enabled
    `);
  }
}
