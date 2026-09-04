import type { EntityManager } from "typeorm";
import { PasswordResetToken } from "../db/entities/password-reset-token.entity.js";

export const passwordResetTokenRepository = {
  create(
    manager: EntityManager,
    data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }
  ) {
    const row = manager.create(PasswordResetToken, {
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      usedAt: null,
    });
    return manager.save(row);
  },

  findByTokenHash(tokenHash: string, manager: EntityManager) {
    return manager.findOne(PasswordResetToken, {
      where: { tokenHash },
      relations: { user: true },
    });
  },

  deleteForUser(userId: string, manager: EntityManager) {
    return manager.delete(PasswordResetToken, { userId });
  },

  save(manager: EntityManager, token: PasswordResetToken) {
    return manager.save(token);
  },
};
