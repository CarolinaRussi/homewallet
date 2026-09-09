import type { MigrationInterface, QueryRunner } from "typeorm";

export class UserEmailVerified20260909091000 implements MigrationInterface {
  name = "UserEmailVerified20260909091000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN email_verified_at timestamptz NULL
    `);
    // Existing accounts were created before verification existed.
    await queryRunner.query(`
      UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL
    `);
    await queryRunner.query(`
      CREATE TABLE email_verify_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX email_verify_tokens_user_id_idx
        ON email_verify_tokens (user_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX email_verify_tokens_token_hash_idx
        ON email_verify_tokens (token_hash)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_verify_tokens`);
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at
    `);
  }
}
