import type { MigrationInterface, QueryRunner } from "typeorm";

export class EntriesAndCategories20260903200000 implements MigrationInterface {
  name = "EntriesAndCategories20260903200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        name text NOT NULL,
        is_default boolean NOT NULL DEFAULT false,
        UNIQUE (space_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        type text NOT NULL,
        amount numeric(14, 2) NOT NULL,
        description text NOT NULL DEFAULT '',
        visibility text NOT NULL,
        occurred_on date NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX entries_space_user_month_idx
      ON entries (space_id, user_id, occurred_on)
    `);

    await queryRunner.query(`
      CREATE INDEX entries_space_shared_month_idx
      ON entries (space_id, visibility, occurred_on)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE entries`);
    await queryRunner.query(`DROP TABLE categories`);
  }
}
