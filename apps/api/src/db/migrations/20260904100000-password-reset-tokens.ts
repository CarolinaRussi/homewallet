import type { MigrationInterface, QueryRunner } from "typeorm";

export class PasswordResetTokens20260904100000 implements MigrationInterface {
  name = "PasswordResetTokens20260904100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX password_reset_tokens_user_id_idx
        ON password_reset_tokens (user_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX password_reset_tokens_token_hash_idx
        ON password_reset_tokens (token_hash)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens`);
  }
}
