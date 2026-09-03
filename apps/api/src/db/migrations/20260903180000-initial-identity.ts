import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialIdentity20260903180000 implements MigrationInterface {
  name = "InitialIdentity20260903180000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password_hash text,
        google_sub text UNIQUE,
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE spaces (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        currency text NOT NULL,
        privacy_mode text NOT NULL DEFAULT 'private',
        join_code text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        role text NOT NULL,
        UNIQUE (user_id, space_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE memberships`);
    await queryRunner.query(`DROP TABLE spaces`);
    await queryRunner.query(`DROP TABLE users`);
  }
}
