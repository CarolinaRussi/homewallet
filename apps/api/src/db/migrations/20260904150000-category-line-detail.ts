import type { MigrationInterface, QueryRunner } from "typeorm";

export class CategoryLineDetail20260904150000 implements MigrationInterface {
  name = "CategoryLineDetail20260904150000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS line_detail_enabled boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE categories
      SET line_detail_enabled = true
      WHERE name = 'Cartão de Crédito'
    `);
    await queryRunner.query(`
      INSERT INTO categories (
        id, space_id, name, is_default, budget_layer, line_detail_enabled
      )
      SELECT
        gen_random_uuid(),
        space.id,
        'Cartão de Crédito',
        true,
        'personal',
        true
      FROM spaces space
      WHERE NOT EXISTS (
        SELECT 1
        FROM categories category
        WHERE category.space_id = space.id
          AND category.name = 'Cartão de Crédito'
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
        DROP COLUMN IF EXISTS line_detail_enabled
    `);
  }
}
