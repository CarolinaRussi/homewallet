import type { MigrationInterface, QueryRunner } from "typeorm";

export class ReservePots20260904010000 implements MigrationInterface {
  name = "ReservePots20260904010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE reserve_pots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (space_id, user_id, name)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_reserve_pots_space_user
      ON reserve_pots (space_id, user_id)
    `);

    await queryRunner.query(`
      INSERT INTO reserve_pots (space_id, user_id, name)
      SELECT DISTINCT space_id, user_id, 'Poupancinha'
      FROM memberships
    `);

    await queryRunner.query(`
      ALTER TABLE reserve_movements
        ADD COLUMN reserve_pot_id uuid NULL
        REFERENCES reserve_pots(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      UPDATE reserve_movements movement
      SET reserve_pot_id = pot.id
      FROM reserve_pots pot
      WHERE pot.space_id = movement.space_id
        AND pot.user_id = movement.user_id
        AND pot.name = 'Poupancinha'
    `);
    await queryRunner.query(`
      ALTER TABLE reserve_movements
        ALTER COLUMN reserve_pot_id SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE entries
        ADD COLUMN reserve_pot_id uuid NULL
        REFERENCES reserve_pots(id) ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      INSERT INTO categories (id, space_id, name, is_default, budget_layer)
      SELECT gen_random_uuid(), space.id, 'Poupancinha', true, 'future'
      FROM spaces space
      WHERE NOT EXISTS (
        SELECT 1 FROM categories category
        WHERE category.space_id = space.id AND category.name = 'Poupancinha'
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE entries DROP COLUMN reserve_pot_id
    `);
    await queryRunner.query(`
      ALTER TABLE reserve_movements DROP COLUMN reserve_pot_id
    `);
    await queryRunner.query(`DROP TABLE reserve_pots`);
  }
}
